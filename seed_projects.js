require('dotenv').config();
const supabase = require('./config/supabase');

const seedProjects = async () => {
    console.log('🌱 Seeding Projects...');

    const projects = [
        {
            title: 'SRHR Youth Empowerment Program',
            description: 'Comprehensive sexual and reproductive health education for youth in West Pokot',
            status: 'active',
            category: 'SRHR',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            budget: 150000,
            progress: 65,
            location: 'West Pokot County'
        },
        {
            title: 'Climate Resilience Initiative',
            description: 'Building climate adaptation capacity in drought-prone areas',
            status: 'active',
            category: 'Climate Action',
            start_date: '2024-03-01',
            end_date: '2025-02-28',
            budget: 200000,
            progress: 40,
            location: 'Kapenguria, Sigor'
        },
        {
            title: 'Child Protection Advocacy',
            description: 'Strengthening child protection systems and awareness',
            status: 'active',
            category: 'Child Protection',
            start_date: '2024-06-01',
            end_date: '2024-11-30',
            budget: 80000,
            progress: 85,
            location: 'West Pokot County'
        },
        {
            title: 'Youth Civic Engagement Workshop',
            description: 'Empowering youth to participate in local governance',
            status: 'completed',
            category: 'Inclusive Governance',
            start_date: '2024-01-15',
            end_date: '2024-06-30',
            budget: 50000,
            progress: 100,
            location: 'Kapenguria'
        }
    ];

    for (const project of projects) {
        const { data, error } = await supabase
            .from('projects')
            .upsert(project, { onConflict: 'title' })
            .select();

        if (error) {
            console.error(`❌ Failed to add ${project.title}:`, error.message);
        } else {
            console.log(`✅ Added ${project.title}`);
        }
    }
    console.log('✨ Projects Seeding Complete.');
};

seedProjects();
