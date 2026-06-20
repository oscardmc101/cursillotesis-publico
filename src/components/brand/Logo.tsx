import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  text?: string;
}

const Logo = ({ className, showText = true, text = 'Cursillo Prueba' }: LogoProps) => {
  if (!showText) return null;

  return (
    <div className={cn("flex items-center", className)}>
      <span className="truncate text-xl font-bold text-[#4a9b95]">
        {text}
      </span>
    </div>
  );
};

export default Logo;
