import { getSeries } from '@/lib/actions/series'
import { ProductForm } from '@/components/admin/product-form'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('新增商品', '建立新商品')
}

export default async function NewProductPage() {
  const seriesResult = await getSeries()
  const series = (seriesResult.success ? seriesResult.data : []) || []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">新增商品</h1>
        <p className="mt-2 text-gray-600">建立新的商品資料</p>
      </div>

      <ProductForm series={series} mode="create" />
    </div>
  )
}
