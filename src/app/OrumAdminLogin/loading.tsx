import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/feedback'
import { Stack } from '@/components/ui/layout'
import {
  SkeletonAccesos,
  SkeletonCifras,
  SkeletonPageHeader,
} from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <>
      <SkeletonPageHeader conAccion={false} />

      <Stack gap={7}>
        {/* Tarjeta destacada del flujo estrella. */}
        <Card padding="lg">
          <Stack gap={3}>
            <Skeleton width="min(360px, 80%)" height="22px" radius="var(--radius-sm)" />
            <Skeleton width="100%" height="14px" />
            <Skeleton width="70%" height="14px" />
          </Stack>
        </Card>

        <SkeletonCifras cantidad={3} />
        <SkeletonAccesos cantidad={4} />
      </Stack>
    </>
  )
}
