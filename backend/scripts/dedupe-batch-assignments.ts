/**
 * One-off cleanup: enforce single-batch-per-intern rule on existing data.
 *
 * Strategy: for each user_id with more than one BatchAssignment row, keep the
 * earliest (by assigned_at, then _id as tiebreaker) and delete the rest.
 *
 * Usage (from backend/):
 *   npx tsx scripts/dedupe-batch-assignments.ts          # dry run, prints plan
 *   npx tsx scripts/dedupe-batch-assignments.ts --apply  # actually delete
 */

import { connectDB } from "../src/config/db.js";
import BatchAssignment from "../src/models/BatchAssignment.js";
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

async function main() {
  await connectDB();

  const duplicates = await BatchAssignment.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
  }>([
    { $group: { _id: "$user_id", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicates.length === 0) {
    console.log("No interns with multiple batch assignments. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  console.log(
    `Found ${duplicates.length} intern(s) with multiple batch assignments.`,
  );

  const idsToDelete: mongoose.Types.ObjectId[] = [];

  for (const dup of duplicates) {
    const userId = dup._id;
    const rows = await BatchAssignment.find({ user_id: userId })
      .sort({ assigned_at: 1, _id: 1 })
      .lean();

    const keep = rows[0];
    const drop = rows.slice(1);

    console.log(
      `\nuser_id=${String(userId)} (${rows.length} assignments)`,
    );
    console.log(
      `  KEEP   assignment_id=${String(keep._id)} batch_id=${String(keep.batch_id)} assigned_at=${keep.assigned_at?.toISOString()}`,
    );
    for (const row of drop) {
      console.log(
        `  DROP   assignment_id=${String(row._id)} batch_id=${String(row.batch_id)} assigned_at=${row.assigned_at?.toISOString()}`,
      );
      idsToDelete.push(row._id);
    }
  }

  console.log(
    `\nTotal rows to delete: ${idsToDelete.length} (across ${duplicates.length} intern(s)).`,
  );

  if (!APPLY) {
    console.log(
      "Dry run only. Re-run with --apply to actually delete the rows above.",
    );
  } else {
    const result = await BatchAssignment.deleteMany({
      _id: { $in: idsToDelete },
    });
    console.log(`Deleted ${result.deletedCount} row(s).`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
