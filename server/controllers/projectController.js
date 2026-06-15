import prisma from "../configs/prisma.js";

export const createProject = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { workspace_id: workspaceId, description, name, status, 
                start_date, end_date, team_members, team_lead, progress, priority } = req.body;

        if (!workspaceId) {
            return res.status(400).json({ message: "workspaceId is required" });
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: { include: { user: true } } }
        });

        if (!workspace) return res.status(404).json({ message: "Workspace not found" });

        if (!workspace.members.some((m) => m.userId === userId && m.role === "ADMIN")) {
            return res.status(403).json({ message: "You don't have permission to create projects" });
        }

        const teamLead = await prisma.user.findUnique({
            where: { email: team_lead },
            select: { id: true }
        });

        if (!teamLead) return res.status(404).json({ message: "Team lead user not found" });

        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                team_lead: teamLead.id,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null
            }
        });

        if (team_members?.length > 0) {
            const membersToAdd = [];
            workspace.members.forEach((member) => {
                if (team_members.includes(member.user.email)) {
                    membersToAdd.push(member.user.id);
                }
            });
            await prisma.projectMember.createMany({
                data: membersToAdd.map((memberId) => ({
                    projectId: project.id,
                    userId: memberId
                }))
            });
        }

        const projectWithMembers = await prisma.project.findUnique({
            where: { id: project.id },
            include: {
                members: { include: { user: true } },
                tasks: {
                    include: {
                        assignee: true,
                        comments: { include: { user: true } }
                    }
                }
            }
        });

        res.json({ project: projectWithMembers, message: "Project created successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

export const updateProject = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { id } = req.params;
        const { workspaceId, description, name, status,
                start_date, end_date, progress, priority, team_lead } = req.body;

        // ✅ Guard against missing workspaceId
        if (!workspaceId) {
            return res.status(400).json({ message: "workspaceId is required" });
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: { include: { user: true } } }
        });

        if (!workspace) return res.status(404).json({ message: "Workspace not found" });

        if (!workspace.members.some((m) => m.userId === userId && m.role === "ADMIN")) {
            const project = await prisma.project.findUnique({ where: { id } });
            if (!project) return res.status(404).json({ message: "Project not found" });
            // ✅ Fixed: schema field is team_lead not teamLeadId
            if (project.team_lead !== userId) {
                return res.status(403).json({ message: "You don't have permission to update this project" });
            }
        }

        // ✅ Only fetch teamLead if email provided
        let teamLeadId = undefined;
        if (team_lead) {
            const teamLeadUser = await prisma.user.findUnique({
                where: { email: team_lead },
                select: { id: true }
            });
            if (!teamLeadUser) return res.status(404).json({ message: "Team lead user not found" });
            teamLeadId = teamLeadUser.id;
        }

        const project = await prisma.project.update({
            where: { id },
            data: {
                name,
                description,
                status,
                priority,
                progress,
                // ✅ Only update team_lead if provided
                ...(teamLeadId && { team_lead: teamLeadId }),
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null
            }
        });

        res.json({ project, message: "Project updated successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

export const addMember = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { projectId } = req.params;
        const { email } = req.body;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) return res.status(404).json({ message: "Project not found" });

        // ✅ Fixed: schema field is team_lead not teamLeadId
        if (project.team_lead !== userId) {
            return res.status(403).json({ message: "Only project lead can add members" });
        }

        const existingMember = project.members.find((m) => m.user.email === email);
        if (existingMember) return res.status(400).json({ message: "User is already a member" });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const member = await prisma.projectMember.create({
            data: { projectId, userId: user.id }
        });

        res.json({ member, message: "Member added successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}