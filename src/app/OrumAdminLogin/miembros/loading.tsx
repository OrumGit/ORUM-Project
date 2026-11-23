import {
  SkeletonBuscador,
  SkeletonPageHeader,
  SkeletonTabla,
} from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <>
      <SkeletonPageHeader />
      <SkeletonBuscador />
      <SkeletonTabla filas={8} />
    </>
  )
}
