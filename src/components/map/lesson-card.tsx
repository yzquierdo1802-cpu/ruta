import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

function CardFace({
  photo,
  title,
  subtitle,
  cta,
}: {
  photo: string;
  title: string;
  subtitle: string;
  cta: string;
}) {
  return (
    <>
      <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-navy/90" />
      <div className="relative flex h-full flex-col items-center px-3 pb-5 pt-8 text-center sm:px-4 sm:pb-6 sm:pt-10">
        <h2 className="text-base font-bold text-white sm:text-lg">{title}</h2>
        <p className="mt-1 line-clamp-2 text-xs text-white/80 sm:text-sm">{subtitle}</p>
        <span className="mt-auto inline-flex h-11 min-w-28 items-center justify-center rounded-full bg-coral px-5 text-sm font-semibold text-coral-foreground shadow-sm">
          {cta}
        </span>
      </div>
    </>
  );
}

const cardClass =
  "relative flex h-56 w-full cursor-pointer touch-manipulation flex-col overflow-hidden rounded-2xl border border-white/20 shadow-lg sm:h-72 sm:w-48 sm:shrink-0";

export function LessonCard({
  to,
  params,
  onClick,
  photo,
  title,
  subtitle,
  cta = "Iniciar",
  dimmed,
}: {
  to?: "/lesson/$id" | "/review" | "/chat";
  params?: { id: string };
  onClick?: () => void;
  photo: string;
  title: string;
  subtitle: string;
  cta?: string;
  dimmed?: boolean;
}) {
  const className = cn(cardClass, dimmed && "opacity-70");
  const face = <CardFace photo={photo} title={title} subtitle={subtitle} cta={cta} />;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {face}
      </button>
    );
  }
  if (to === "/lesson/$id" && params) {
    return (
      <Link to="/lesson/$id" params={params} className={className}>
        {face}
      </Link>
    );
  }
  if (to === "/review") {
    return (
      <Link to="/review" className={className}>
        {face}
      </Link>
    );
  }
  if (to === "/chat") {
    return (
      <Link to="/chat" className={className}>
        {face}
      </Link>
    );
  }
  return <div className={className}>{face}</div>;
}
