import "./globals.css";

export const metadata = {
  title: "Black Scorpions CRM",
  description: "Recruitment Management System"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
