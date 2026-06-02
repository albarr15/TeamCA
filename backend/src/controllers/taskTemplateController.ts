import { Request, Response } from 'express';
import TaskTemplate from '../models/TaskTemplate.js';
import Task from '../models/Task.js';

export const createTaskTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, priority, recurrenceRule, customRecurrenceDays, defaultAssignee, departmentId } = req.body;
    
    // Fix: Use user_id matching your authMiddleware definition
    const userId = (req.user as any)?.user_id || (req.user as any)?._id; 

    if (!userId) {
      res.status(401).json({ message: 'User ID missing from token.' });
      return;
    }

    const newTemplate = new TaskTemplate({
      title,
      description,
      priority,
      recurrenceRule,
      customRecurrenceDays,
      defaultAssignee: defaultAssignee || undefined, // Prevents casting errors for empty strings
      departmentId: departmentId || undefined,       // Prevents casting errors for empty strings
      createdBy: userId,
    });

    const savedTemplate = await newTemplate.save();
    res.status(201).json(savedTemplate);
  } catch (error: any) {
    // We log the detailed error in the backend console to easily debug future issues
    console.error("Template Creation Error:", error);
    res.status(500).json({ message: 'Error creating task template', error: error.message });
  }
};

export const getTaskTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId } = req.query;
    
    // If a department is passed, get department + global templates. Otherwise, just global.
    const filter: any = { isActive: true };
    if (departmentId) {
      filter.$or = [{ departmentId }, { departmentId: { $exists: false } }, { departmentId: null }];
    }

    const templates = await TaskTemplate.find(filter)
      .populate('defaultAssignee', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');
      
    res.status(200).json(templates);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};

export const updateTaskTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Clean up potentially empty strings from frontend before updating
    const updateData = { ...req.body };
    if (updateData.departmentId === "") updateData.departmentId = undefined;
    if (updateData.defaultAssignee === "") updateData.defaultAssignee = undefined;

    const updatedTemplate = await TaskTemplate.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedTemplate) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }
    
    res.status(200).json(updatedTemplate);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating template', error: error.message });
  }
};

export const createTaskFromTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { templateId } = req.params;
    const { dueDate, assignedTo } = req.body;
    const userId = (req.user as any)?.user_id || (req.user as any)?._id;

    const template = await TaskTemplate.findById(templateId);
    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    const newTask = new Task({
      title: template.title,
      description: template.description,
      priority: template.priority,
      assignedTo: assignedTo || template.defaultAssignee,
      departmentId: template.departmentId,
      createdBy: userId,
      dueDate: dueDate, 
      status: 'Pending',
      isRecurring: true,
      recurrenceTemplateId: template._id
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error: any) {
    console.error("Spawn Task Error:", error);
    res.status(500).json({ message: 'Error spawning task from template', error: error.message });
  }
};