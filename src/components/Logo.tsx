import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export const Logo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const px = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const text = size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className={`relative ${px} grid place-items-center rounded-xl bg-gradient-coral shadow-coral`}>
        <Heart className="h-4 w-4 text-white fill-white" strokeWidth={2.5} />
        <span className="absolute inset-0 rounded-xl border border-white/20" />
      </div>
      <span className={`font-display font-bold tracking-tight ${text}`}>
        Heart<span className="text-gradient-coral">IQ</span>
      </span>
    </Link>
  );
};
