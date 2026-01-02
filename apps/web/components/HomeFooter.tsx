export default function HomeFooter() {
  return (
    <footer className="border-t border-border py-12 bg-black">
      <p className="text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} LicenseFlow. All rights reserved.
      </p>
    </footer>
  );
}
