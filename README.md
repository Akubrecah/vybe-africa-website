# VYBE Africa (Voices of Youth for Better Engagement)

**VYBE Africa** is a youth-led Community-Based Organization (CBO) located in West Pokot County, Kenya. This repository contains the source code for the organization's official website, designed to highlight its mission, key focus areas, and impact.

## 🚀 Project Overview

The website is built with a focus on modern aesthetics, responsiveness, and accessibility, emulating the professional standards of international NGO platforms (specifically referencing the ActionAid Kenya design system). It serves as a hub for:
*   Showcasing VYBE's work in SRHR, Climate Action, Child Protection, and Governance.
*   Sharing media galleries of recent activities.
*   Encouraging community involvement and partnerships.

## 🎨 Design System

The design is strictly aligned with the **ActionAid International Kenya** visual identity:

*   **Primary Color**: `#cb4154` (ActionAid Red)
*   **Secondary Color**: `#131d3b` (Navy Blue - used for headings and key text)
*   **Typography**:
    *   **Headings**: `Rubik` (Bold, Modern) - *H1 set to 58px*
    *   **Body**: `Karla` (Clean, Readable) - *Base size 17px*
*   **Layout**:
    *   Fixed/Sticky Header with standard navigation.
    *   Wide responsive containers (`max-width: 1240px`).
    *   Clean, card-based layouts for content sections.

## 📂 Project Structure

```
VYBE AFRICA/
├── assets/
│   ├── images/          # Site imagery (Logos, Hero banners, Backgrounds)
│   │   └── gallery/     # Gallery specific images
│   └── videos/          # Video assets if any
├── css/
│   ├── styles.css       # Global styles, variables, typography
│   └── layout.css       # Structure for Header, Footer, Grid systems
├── js/
│   └── main.js          # Interactive elements (Mobile menu, Lightbox, etc.)
├── index.html           # Homepage
├── about.html           # Organization history and mission
├── work.html            # access to focus areas
├── gallery.html         # Media gallery (Photos & Videos)
├── contact.html         # Contact form and info
├── get-involved.html    # Donation and volunteer info
└── [Focus Areas].html   # Individual pages for SRHR, Climate, etc.
```

## 🛠️ Technologies Used

*   **HTML5**: Semantic structure.
*   **CSS3**: Custom properties (variables), Flexbox, CSS Grid.
*   **JavaScript (ES6+)**: DOM manipulation for UI interactions.
*   **Google Fonts**: Karla & Rubik.
*   **Font Awesome 6**: UI Icons.
*   **Lightbox2**: For the image gallery overlay.

## 📦 Setup & Usage

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Start-Trek-Hub/Vybe-Africa.git
    ```
2.  **Open locally**:
    Simply open `index.html` in any modern web browser. No build step or server is required for the static pages.

3.  **Deploy**:
    This project is static and can be deployed instantly to platforms like:
    *   **GitHub Pages** (Recommended)
    *   Netlify
    *   Vercel

## 🤝 Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📞 Contact

**VYBE Africa**
*   **Location**: West Pokot County, Kenya
*   **Email**: info@vybeafrica.org (Placeholder)
*   **Phone**: +254 700 000 000 (Placeholder)

---
*Built with ❤️ for the youth of West Pokot.*
