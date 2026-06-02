import { Request, Response } from 'express';
import TaskTemplate from '../models/TaskTemplate';
import Task from '../models/Task';

export const createTaskTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, priority, recurrenceRule, customRecurrenceDays, defaultAssignee, departmentId } = req.body;
    const userId = req.user?.id; // Assuming auth middleware attaches user

    const newTemplate = new TaskTemplate({
      title,
      description,
      priority,
      recurrenceRule,
      customRecurrenceDays,
      defaultAssignee,
      departmentId,
      createdBy: userId,
    });

    const savedTemplate = await newTemplate.save();
    res.status(201).json(savedTemplate);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating task template', error: error.message });
  }
};

export const getTaskTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId } = req.query;
    const filter = departmentId ? { departmentId, isActive: true } : { isActive: true };
    
    const templates = await TaskTemplate.find(filter)
      .populate('defaultAssignee', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');
      
    res.status(200).json(templates);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};

export const updateTaskTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedTemplate = await TaskTemplate.findByIdAndUpdate(id, req.body, { new: true });
    
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
    const userId = req.user?.id;

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
      dueDate: dueDate, // Frontend should calculate the next due date based on the recurrence rule
      status: 'Pending',
      isRecurring: true,
      recurrenceTemplateId: template._id
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error: any) {
    res.status(500).json({ message: 'Error spawning task from template', error: error.message });
  }
};