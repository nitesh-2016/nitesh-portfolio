# Nitesh Sharma - Portfolio

A polished, professional digital resume and portfolio site built with Astro, TypeScript, and Tailwind CSS.

[![Deploy to GitHub Pages](https://github.com/nitesh-2016/nitesh-portfolio/actions/workflows/deploy.yml/badge.svg)](https://github.com/nitesh-2016/nitesh-portfolio/actions/workflows/deploy.yml)

🔗 **Live Site:** [https://nitesh-2016.github.io/nitesh-portfolio/](https://nitesh-2016.github.io/nitesh-portfolio/)

## About

This portfolio showcases the work and experience of Nitesh Sharma, a Technical Architect / Solutions Architect with 11+ years of experience in distributed systems, event-driven microservices, and workflow orchestration.

## Features

- ⚡ **Fast & Modern**: Built with Astro for optimal performance
- 📱 **Mobile-First**: Responsive design that works on all devices
- 🎨 **Dark Mode**: Optional dark theme with system preference detection
- ♿ **Accessible**: WCAG 2.1 compliant with semantic HTML
- 🖨️ **Print-Friendly**: Dedicated resume page optimized for printing/PDF export
- 📊 **SEO Optimized**: Meta tags, Open Graph, and sitemap included
- 🚀 **Static Site**: Minimal JavaScript, mostly pre-rendered HTML

## Tech Stack

- **Framework**: [Astro](https://astro.build) 4.x
- **Styling**: [Tailwind CSS](https://tailwindcss.com) 3.x
- **Language**: TypeScript
- **Deployment**: GitHub Pages & Cloudflare Pages ready

## Project Structure

```
/
├── public/              # Static assets
│   ├── favicon.svg
│   ├── robots.txt
│   └── cover-letter.pdf
├── src/
│   ├── components/      # Reusable components
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/         # Page layouts
│   │   ├── BaseLayout.astro
│   │   └── MainLayout.astro
│   ├── pages/           # File-based routing
│   │   ├── index.astro        # Home page
│   │   ├── about.astro        # About page
│   │   ├── experience.astro   # Experience page
│   │   ├── skills.astro       # Skills page
│   │   ├── work.astro         # Selected work
│   │   ├── resume.astro       # Printable resume
│   │   ├── contact.astro      # Contact page
│   │   └── blog.astro         # Blog (coming soon)
│   └── styles/          # Global styles
│       └── global.css
├── astro.config.mjs     # Astro configuration
├── tailwind.config.mjs  # Tailwind configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm, yarn, or pnpm

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/nitesh-2016/nitesh-portfolio.git
cd nitesh-portfolio
```

2. **Install dependencies**

```bash
npm install
```

3. **Start development server**

```bash
npm run dev
```

The site will be available at `http://localhost:4321`

### Build for Production

```bash
npm run build
```

This generates a static site in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment

### GitHub Pages (Automated)

This repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages on every push to `main`.

**Setup:**

1. Go to your repository Settings → Pages
2. Under "Build and deployment", select "GitHub Actions" as the source
3. Push to `main` branch - the site will deploy automatically
4. Visit: `https://nitesh-2016.github.io/nitesh-portfolio/`

**Custom Domain (Optional):**

1. Add a `CNAME` file to the `public/` directory with your domain
2. Update `site` in `astro.config.mjs` to your custom domain
3. Remove or update the `base` setting if using a custom domain

### Cloudflare Pages

**Option 1: Git Integration (Recommended)**

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Select this repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: 20
5. Click **Save and Deploy**

**Option 2: Direct Upload**

```bash
npm run build
npx wrangler pages deploy dist
```

**Custom Domain on Cloudflare:**

1. Go to your Pages project → **Custom domains**
2. Add your domain and follow DNS setup instructions
3. Update `site` and remove `base` in `astro.config.mjs`

## Configuration

### Site URLs

The site is configured for GitHub Pages by default:

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://nitesh-2016.github.io',
  base: '/nitesh-portfolio',
});
```

For a custom domain, update to:

```js
export default defineConfig({
  site: 'https://your-domain.com',
  // Remove or set base: '/'
});
```

### Dark Mode

Dark mode is enabled by default and respects system preferences. Users can toggle it using the theme button in the navigation.

## Content Updates

All content is in the `src/pages/` directory. Key pages to update:

- `index.astro` - Home page hero and overview
- `about.astro` - Professional summary and background
- `experience.astro` - Work history and projects
- `skills.astro` - Technical skills and expertise
- `work.astro` - Featured case studies
- `contact.astro` - Contact information
- `resume.astro` - Printable resume format

Replace `public/cover-letter.pdf` with your own cover letter.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run astro` - Run Astro CLI commands

## Browser Support

- Chrome, Edge, Firefox, Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

## License

[MIT License](LICENSE) - feel free to use this template for your own portfolio.

## Contact

**Nitesh Sharma**
- Email: [nsnitesh92@gmail.com](mailto:nsnitesh92@gmail.com)
- LinkedIn: [linkedin.com/in/nitesh-sharma-90035491](https://www.linkedin.com/in/nitesh-sharma-90035491/)
- GitHub: [github.com/nitesh-2016](https://github.com/nitesh-2016)

---

Built with [Astro](https://astro.build) 🚀
