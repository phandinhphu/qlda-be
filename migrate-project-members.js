/**
 * Migration script to create ProjectMember records for existing projects
 * This ensures all project creators have a corresponding ProjectMember entry
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./src/apis/models/Project');
const ProjectMember = require('./src/apis/models/ProjectMember');
const { MONGODB_URI } = require('./src/util/constants');

async function migrateProjectMembers() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to database');

        // Find all projects
        const projects = await Project.find();
        console.log(`Found ${projects.length} projects`);

        let createdCount = 0;
        let existingCount = 0;
        let errorCount = 0;

        // For each project, check if a ProjectMember exists for the creator
        for (const project of projects) {
            try {
                // Check if ProjectMember already exists for this project and user
                const existingMember = await ProjectMember.findOne({
                    project_id: project._id,
                    user_id: project.created_by,
                });

                if (existingMember) {
                    console.log(`ProjectMember already exists for project ${project._id}, user ${project.created_by}`);
                    existingCount++;
                } else {
                    // Create ProjectMember for project creator
                    const newProjectMember = new ProjectMember({
                        project_id: project._id,
                        user_id: project.created_by,
                        role: 'owner',
                        joined_at: project.created_at,
                    });
                    await newProjectMember.save();
                    console.log(`Created ProjectMember for project ${project._id}, user ${project.created_by}`);
                    createdCount++;
                }
            } catch (error) {
                console.error(`Error processing project ${project._id}:`, error.message);
                errorCount++;
            }
        }

        console.log('\nMigration completed:');
        console.log(`- Projects processed: ${projects.length}`);
        console.log(`- New ProjectMembers created: ${createdCount}`);
        console.log(`- Already existing: ${existingCount}`);
        console.log(`- Errors: ${errorCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
migrateProjectMembers();

