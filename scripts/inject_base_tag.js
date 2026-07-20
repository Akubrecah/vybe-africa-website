const fs = require('fs');
const path = require('path');

function injectBaseInDir(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            injectBaseInDir(fullPath);
        } else if (file.endsWith('.html')) {
            let html = fs.readFileSync(fullPath, 'utf8');
            // If <base href="/"> doesn't exist, inject it after <head> or similar tag
            if (!html.includes('<base href=')) {
                // Find <head> or <head class="...">
                const headRegex = /(<head[^>]*>)/i;
                if (headRegex.test(html)) {
                    html = html.replace(headRegex, '$1\n  <base href="/">');
                    fs.writeFileSync(fullPath, html, 'utf8');
                    console.log(`✅ Injected <base href="/"> into ${fullPath}`);
                }
            } else {
                // Replace any incorrect base href with "/"
                html = html.replace(/<base href="[^"]*">/i, '<base href="/">');
                fs.writeFileSync(fullPath, html, 'utf8');
                console.log(`⏭️  Ensured correct <base href="/"> in ${fullPath}`);
            }
        }
    });
}

// Run for staff and members directories
injectBaseInDir(path.join(__dirname, '..', 'staff'));
injectBaseInDir(path.join(__dirname, '..', 'members'));
console.log('🎉 Base tag injection completed successfully!');
