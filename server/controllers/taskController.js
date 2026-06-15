import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

export const createTask = async (req, res) => {
    try {
        const { userId } = req.auth; // ✅ Fixed: removed ()
        const { projectId, title, description, type, status, priority, assigneeId, due_date } = req.body;
        const origin = req.get('origin');

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        } else if (assigneeId && !project.members.find((member) => member.user.id === assigneeId)) {
            return res.status(403).json({ message: "Assignee is not a member of the project" });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                type, // ✅ Fixed: was missing
                status,
                priority,
                assigneeId,
                due_date: new Date(due_date)
            }
        });

        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true, comments: { include: { user: true } } }
        });

        await inngest.send({
            name: "app/task.assigned",
            data: { taskId: task.id, origin }
        });

        res.json({ task: taskWithAssignee, message: "Task created successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

export const updateTask = async (req, res) => {
    try {
        const { userId } = req.auth; // ✅ Fixed: removed ()

        const task = await prisma.task.findUnique({
            where: { id: req.params.id },
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        // ✅ Fixed: was 'updateTask' (wrong name) should be 'updatedTask'
        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data: req.body
        });

        res.json({ task: updatedTask, message: "Task updated successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

export const deleteTask = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { tasksIds } = req.body; // ✅ Fixed: was taskIds, frontend sends tasksIds

        if (!tasksIds || tasksIds.length === 0) {
            return res.status(400).json({ message: "No task IDs provided" });
        }

        const tasks = await prisma.task.findMany({
            where: { id: { in: tasksIds } },
        });

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Tasks not found" });
        }

        const project = await prisma.project.findUnique({
            where: { id: tasks[0].projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges" });
        }

        await prisma.task.deleteMany({
            where: { id: { in: tasksIds } },
        });

        res.json({ message: "Tasks deleted successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}