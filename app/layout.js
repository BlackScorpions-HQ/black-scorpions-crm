export const metadata = {
  title: "Black Scorpions CRM",
  description: "Black Scorpions Recruitment Agency CRM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
