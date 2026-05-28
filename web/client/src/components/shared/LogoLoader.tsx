import './LogoLoader.css'

interface LogoLoaderProps {
  size?: number
  className?: string
}

export function LogoLoader({ size = 64, className = '' }: LogoLoaderProps) {
  return (
    <div className={`logo-loader ${className}`} style={{ height: size }}>
      <div className="logo-loader__outline" />
      <div className="logo-loader__fill" />
    </div>
  )
}

export function FullPageLoader() {
  return (
    <div className="logo-loader-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <LogoLoader size={80} />
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LogoLoader size={64} />
    </div>
  )
}
