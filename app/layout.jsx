
import "./globals.css";

export const metadata = {
  title: "Black Scorpions CRM",
  description: "Black Scorpions Recruitment Agency CRM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="global-background" />
        <div className="global-overlay" />
        <div className="app-content">
          {children}
        </div>
      </body>
    </html>
  );
}
