import { SkeletonPageHeader, SkeletonTabla } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <>
      <SkeletonPageHeader />
      <SkeletonTabla filas={5} />
    </>
  )
}
