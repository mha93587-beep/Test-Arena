import { useState } from "react";
import { Link } from "react-router-dom";

const examItems = [
  { icon: "school", label: "SSC", slug: "ssc-cgl" },
  { icon: "train", label: "Railway", slug: "railway-rrb-ntpc" },
  { icon: "groups", label: "Group-D", slug: "railway-rrb-group-d" },
  { icon: "workspace_premium", label: "UPSC", slug: "upsc-cse" },
  { icon: "account_balance", label: "Banking", slug: "ibps-po" },
  { icon: "science", label: "GATE", slug: "gate-cs" },
  { icon: "medical_services", label: "NEET", slug: "neet" },
];

const bottomItems = [
  { icon: "history", label: "History", path: "/review" },
  { icon: "explore", label: "Discovery", path: "/discovery" },
];

const Sidebar = () => {
  const [active, setActive] = useState("SSC");

  return (
    <aside className="hidden lg:flex flex-col h-[calc(100vh-72px)] w-64 fixed left-0 bg-surface-container-low py-6 px-4 gap-4 border-r border-outline-variant/10">
      <div className="px-4 mb-2">
        <h2 className="font-headline font-bold text-primary text-base">Exam Library</h2>
        <p className="text-xs text-muted-foreground font-medium">AI-Powered Prep</p>
      </div>
      <nav className="flex flex-col gap-1">
        {examItems.map((item) => (
          <Link
            key={item.label}
            to={`/exam/${item.slug}`}
            onClick={() => setActive(item.label)}
            data-testid={`sidebar-${item.label.toLowerCase()}`}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left ${
              active === item.label
                ? "text-primary font-bold bg-primary/8 border border-primary/20"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            }`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className="font-body text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-outline-variant/20">
        {bottomItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-200"
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className="font-body text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
