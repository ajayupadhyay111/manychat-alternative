# AutoDM - Instagram DM Automation

AutoDM is a Next.js web application built to automate Instagram Direct Messages (DMs) triggered by specific keywords in post or Reel comments. It acts as an open-source, customizable alternative to platforms like ManyChat.

## Features

- **Keyword-Triggered DMs**: Define specific keywords that, when commented on your Instagram posts or Reels, automatically send a customizable DM to the commenter.
- **Dynamic DM Templates**: Use placeholders like `{{name}}` to personalize messages for each commenter.
- **Reel-Specific Rules**: Apply automation rules globally across all posts or target them to specific Reels.
- **Analytics Dashboard**: Track the performance of your rules with an overview of total comments processed, DMs sent, failed/queued messages, and top-performing keywords.
- **Action Logs**: View a detailed history of all automated actions, including statuses (sent, failed, queued, skipped) and errors for easy debugging.
- **Reels Integration**: Browse your recent Instagram Reels directly from the dashboard to quickly set up new rules.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Frontend**: React 18, Tailwind CSS, TypeScript
- **Backend Services**: Firebase Admin SDK
- **Fonts**: JetBrains Mono, Outfit

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A Firebase project with Admin credentials
- Meta Developer App (for Instagram Graph API integration)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd autodm
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up environment variables. Refer to the provided setup guides for detailed instructions on obtaining the necessary API keys and credentials:
   - `AutoDM-Meta-Setup-Guide.docx`
   - `AutoDM-Setup-Guide.docx`

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Documentation

For comprehensive instructions on setting up the Facebook/Instagram Graph API and deploying the application, please refer to the `.docx` guides included in the repository.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
