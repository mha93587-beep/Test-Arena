import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="w-full py-8 bg-background border-t border-outline-variant/10">
    <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 w-full gap-4">
      <div className="flex flex-col items-center md:items-start">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary filled text-xl">bolt</span>
          <span className="font-black text-primary font-headline text-lg">Test Arena</span>
        </div>
        <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5">
          © 2025 Test Arena · testarena.ai · AI-Powered Exam Prep
        </p>
      </div>
      <div className="flex gap-6 md:gap-8">
        <Link to="/discovery" className="font-label text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          Discovery
        </Link>
        <Link to="/exam/ssc-cgl" className="font-label text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          SSC CGL
        </Link>
        <Link to="/exam/upsc-cse" className="font-label text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          UPSC CSE
        </Link>
        <Link to="#" className="font-label text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          Privacy
        </Link>
      </div>
    </div>
  </footer>
);

export default Footer;
