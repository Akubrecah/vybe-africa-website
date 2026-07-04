# VYBE Africa - Youth Empowerment Website

**Live Demo**: [https://vybe-africa-website.vercel.app/index.html](https://vybe-africa-website.vercel.app/index.html)

## 🌍 Overview
VYBE Africa (Visionary Youth-Based Empowerment) is a youth-led Community-Based Organization (CBO) in West Pokot, Kenya. This website serves as their digital headquarters, showcasing their impactful work in **SRHR**, **Climate Action**, **Child Protection**, and **Inclusive Governance**.

The site has been completely redesigned with a **Premium "Dark Mode" Aesthetic** inspired by high-end creative agencies (QClay style), featuring neon accents, glassmorphism, and smooth animations to reflect the vibrant energy of youth.

---

## ✨ Key Features

### 🎨 Visual & UI Design
-   **Dual-Theme System**: A robust **Light/Dark Mode** toggle that persists user preference via `localStorage`.
    -   **Dark Mode**: Deep `#050505` background with Neon Red/Purple accents.
    -   **Light Mode**: Clean White background with High-Contrast Dark text.
-   **Glassmorphism**: Translucent, blurred headers and cards for a modern, layered feel.
-   **Neon Aesthetics**: Glowing text, borders, and gradients that stand out against the dark canvas.
-   **Responsive Layout**: Fully mobile-optimized with a custom hamburger menu and touch-friendly interactions.

### ⚡ Technical Features
-   **Animated Stats**: "Impact Numbers" (Youth Trained, Communities, etc.) count up dynamically when scrolled into view.
-   **Scroll Animations**: Elements fade up and slide in smoothly using `IntersectionObserver`.
-   **Video Lightbox**: "Watch Reel" button opens a seamless popup video player using **GLightbox**, keeping users on the site.
-   **Masonry Gallery**: A dynamic media gallery that arranges images of varying sizes into a neat, organic grid.

---

## 🛠️ Technology Stack

-   **HTML5**: Semantic structure for accessibility and SEO.
-   **CSS3**:
    -   **CSS Variables**: Extensive use of `--primary-brand`, `--surface-dark`, etc., for easy theming.
    -   **Flexbox & Grid**: For complex, responsive layouts.
    -   **Animations**: Keyframes and transitions for interactive flair.
-   **JavaScript (ES6+)**:
    -   `IntersectionObserver` for scroll animations.
    -   `localStorage` for theme persistence.
    -   Dynamic DOM manipulation for counters and mobile menu.
-   **External Libraries**:
    -   [FontAwesome](https://fontawesome.com): For social icons and UI elements.
    -   [GLightbox](https://github.com/biati-digital/glightbox): For the video/image lightbox.
    -   [Google Fonts](https://fonts.google.com): **Syne** (Headings) and **Inter** (Body) typography.

### 🛡️ Admin & Staff Portals
-   **Executive Dashboard**: "BlackGlass" theme for Super Admins with Global Project Map, Financial Overview, and Team Management.
-   **HRFusion Portal**: Dedicated HR dashboard with Employee Directory, Payroll, Recruitment Kanban, and Calendar.
-   **Staff Dashboard**: Role-specific views for Program Managers, Communication Officers, etc.
-   **Secure Auth**: JWT-based authentication with Admin-only account creation (Public registration disabled).

---

## 📂 Project Structure

```bash
/
├── index.html          # Homepage (Hero, Stats, Focus Areas)
├── admin_dashboard.html # Executive Portal (Super Admin)
├── hr_dashboard.html   # HR Management Portal
├── staff.html          # Standard Staff Portal
├── login.html          # Unified Login Page
├── css/
│   ├── styles.css      # Core variables, typography, and utility classes
│   └── layout.css      # Header, Footer, and Component specific styles
├── js/
│   └── main.js         # Theme logic, Mobile Menu, Animations, Counters
├── models/             # MongoDB Models (User, Post, etc.)
├── routes/             # Express API Routes
├── seed.js             # Database Seeder
└── assets/
    └── images/         # Project images and icons
```

---

## 🚀 How to Run Locally

This is a static website, so it requires no backend server setup.

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/vybe-africa-website.git
    ```
2.  **Open the Project**:
    Navigate to the folder and simply double-click `index.html` to open it in your browser.
3.  **Local Server (Optional but Recommended)**:
    For the best experience (especially for loading local assets properly), run a simple local server:
    ```bash
    # using Python
    python3 -m http.server
    # Then visit http://localhost:8000
    ```

---

## 🖌️ Customization Guide

### Changing Colors
All colors are managed in `css/styles.css` under the `:root` variables:
```css
:root {
    --primary-brand: #ff0055; /* Change this for main accent */
    --secondary-brand: #7000ff; /* Secondary accent */
    --background-dark: #050505; /* Main background */
}
```

### Updating Stats
Edit the `data-target` attributes in `index.html` to change the final numbers:
```html
<div class="stat-number" data-target="5000">0</div>
```

### Adding Gallery Images
In `gallery.html`, simply duplicate a `.masonry-item` block and update the `src` attribute.

---

## 🤝 Credits

-   **Design Inspiration**: ActionAid Kenya & QClay Design Agencies.
-   **Development**: Built with ❤️ for VYBE Africa.

---

*“Investing in youth is investing in the future.”*
