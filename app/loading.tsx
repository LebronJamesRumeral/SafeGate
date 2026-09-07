import { DesktopLoadingShell, MobileLoadingShell } from '@/components/auth-loading-overlay';

export default function LoadingHome() {
  return (
    <>
      <MobileLoadingShell progress={100} />
      <DesktopLoadingShell progress={100} />
    </>
  );
}
