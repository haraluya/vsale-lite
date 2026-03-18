'use client'

import { useState, useEffect } from 'react'
import { designTokens } from '@/lib/design-tokens'
import { useAlert, useConfirm } from '@/lib/contexts/dialog-context'
import { BlockTypeSelector } from './BlockTypeSelector'
import { ImageUploadMultiple } from './ImageUploadMultiple'
import { createHomeBlock, updateHomeBlock, deleteHomeBlock } from '@/lib/actions/home-blocks'
import { getActiveSeries } from '@/lib/actions/shop'
import { getAvailableTags } from '@/lib/actions/tags'
import { CreateHomeBlockSchema, UpdateHomeBlockSchema } from '@/lib/validations/home-block.schema'
import type {
  HomePageBlock,
  BlockType,
  ImageCarouselConfig,
  ProductDisplayConfig,
  TextBlockConfig,
  Series,
} from '@/types'
import { Loader2 } from 'lucide-react'

interface HomeBlockFormProps {
  blockId?: string // 編輯模式時提供
  initialData?: HomePageBlock // 編輯模式時提供
  presetType?: BlockType // 從對話框預設的類型（建立模式）
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * 首頁廣告區塊表單元件
 * 支援建立與編輯三種區塊類型：圖片輪播、商品展示、文字區塊
 */
export function HomeBlockForm({ blockId, initialData, presetType, onSuccess, onCancel }: HomeBlockFormProps) {
  const alert = useAlert()
  const confirm = useConfirm()

  // 表單狀態
  const [name, setName] = useState(initialData?.name || '')
  const [blockType, setBlockType] = useState<BlockType>(
    initialData?.block_type || presetType || 'image_carousel'
  )
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 圖片輪播 Config（支援橫向 16:9 和直向 4:5）
  const [carouselImages, setCarouselImages] = useState<Array<{ url: string; series_id?: string | null; combo_deal_id?: string | null }>>(
    (initialData?.block_type === 'image_carousel' || initialData?.block_type === 'image_carousel_portrait')
      ? (initialData.config as ImageCarouselConfig).images
      : []
  )
  const [autoPlay, setAutoPlay] = useState(
    (initialData?.block_type === 'image_carousel' || initialData?.block_type === 'image_carousel_portrait')
      ? (initialData.config as ImageCarouselConfig).auto_play
      : true
  )
  const [intervalMs, setIntervalMs] = useState(
    (initialData?.block_type === 'image_carousel' || initialData?.block_type === 'image_carousel_portrait')
      ? (initialData.config as ImageCarouselConfig).interval_ms
      : 5000
  )

  // 商品展示 Config
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<string[]>(
    initialData?.block_type === 'product_display'
      ? (initialData.config as ProductDisplayConfig).series_ids || []
      : []
  )
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialData?.block_type === 'product_display'
      ? (initialData.config as ProductDisplayConfig).tag_ids || []
      : []
  )
  const [maxItems, setMaxItems] = useState<number | null>(
    initialData?.block_type === 'product_display'
      ? (initialData.config as ProductDisplayConfig).max_items ?? null
      : null
  )

  // 文字區塊 Config
  const [textContent, setTextContent] = useState(
    initialData?.block_type === 'text_block'
      ? ((initialData.config as TextBlockConfig).content || '')
      : ''
  )
  const [fontSize, setFontSize] = useState<'12' | '16' | '20' | '24' | '32' | '40' | '48'>(
    initialData?.block_type === 'text_block'
      ? ((initialData.config as TextBlockConfig).font_size || '16')
      : '16'
  )
  const [textColor, setTextColor] = useState(
    initialData?.block_type === 'text_block'
      ? ((initialData.config as TextBlockConfig).color || '#000000')
      : '#000000'
  )

  // 載入資料
  const [series, setSeries] = useState<Series[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [seriesResult, tagsResult] = await Promise.all([
        getActiveSeries(),
        getAvailableTags(),
      ])

      if (seriesResult.success && seriesResult.data) {
        setSeries(seriesResult.data)
      }

      if (tagsResult.success && tagsResult.data) {
        setTags(tagsResult.data)
      }

      setLoadingData(false)
    }
    fetchData()
  }, [])

  // 除錯：監控 blockType 變化
  useEffect(() => {
    console.log('🔄 blockType 已變更:', blockType)
    console.log('  - textContent:', textContent)
    console.log('  - fontSize:', fontSize)
    console.log('  - textColor:', textColor)
  }, [blockType, textContent, fontSize, textColor])

  // 建構 Config 物件
  const buildConfig = ():
    | ImageCarouselConfig
    | ProductDisplayConfig
    | TextBlockConfig => {
    console.log('🔧 buildConfig 被呼叫，blockType:', blockType)

    if (blockType === 'image_carousel' || blockType === 'image_carousel_portrait') {
      const config = {
        images: carouselImages,
        auto_play: autoPlay,
        interval_ms: intervalMs,
      }
      console.log('🔧 回傳 image_carousel/portrait config:', config)
      return config
    } else if (blockType === 'product_display') {
      const config = {
        series_ids: selectedSeriesIds.length > 0 ? selectedSeriesIds : null,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : null,
        max_items: maxItems,
      }
      console.log('🔧 回傳 product_display config:', config)
      return config
    } else {
      const config = {
        content: textContent,
        font_size: fontSize,
        color: textColor,
      }
      console.log('🔧 回傳 text_block config:', config)
      return config
    }
  }

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 除錯：印出當前所有狀態
    console.log('📋 表單提交前的狀態:')
    console.log('  - blockType:', blockType)
    console.log('  - textContent:', textContent)
    console.log('  - fontSize:', fontSize)
    console.log('  - textColor:', textColor)
    console.log('  - selectedSeriesIds:', selectedSeriesIds)
    console.log('  - selectedTagIds:', selectedTagIds)
    console.log('  - maxItems:', maxItems)

    const config = buildConfig()

    // Zod 驗證
    const input = {
      name,
      block_type: blockType,
      config,
      is_active: isActive,
    }

    // 除錯：印出提交資料
    console.log('📤 前端提交資料:', JSON.stringify(input, null, 2))
    console.log('📤 config 型別:', typeof config, 'blockType:', blockType)

    if (blockId) {
      // 更新模式
      const validation = UpdateHomeBlockSchema.safeParse({ id: blockId, ...input })
      if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors
        const errorMessage = Object.entries(errors)
          .map(([field, messages]) => `${field}: ${(messages || []).join(', ')}`)
          .join('\n')
        await alert({
          title: '驗證失敗',
          message: errorMessage,
          variant: 'error',
        })
        return
      }
    } else {
      // 建立模式
      const validation = CreateHomeBlockSchema.safeParse(input)
      if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors
        const errorMessage = Object.entries(errors)
          .map(([field, messages]) => `${field}: ${(messages || []).join(', ')}`)
          .join('\n')
        await alert({
          title: '驗證失敗',
          message: errorMessage,
          variant: 'error',
        })
        return
      }
    }

    setIsSubmitting(true)

    // 呼叫 Server Action
    const result = blockId
      ? await updateHomeBlock({ id: blockId, ...input })
      : await createHomeBlock(input)

    // 除錯：印出 Server Action 回傳結果
    console.log('📥 Server Action 回傳:', JSON.stringify(result, null, 2))

    setIsSubmitting(false)

    if (!result.success) {
      await alert({
        title: blockId ? '更新失敗' : '建立失敗',
        message: result.message,
        variant: 'error',
      })
      return
    }

    await alert({
      title: blockId ? '更新成功' : '建立成功',
      message: result.message || (blockId ? '區塊更新成功' : '區塊建立成功'),
      variant: 'success',
    })

    onSuccess?.()
  }

  // 處理刪除
  const handleDelete = async () => {
    if (!blockId) return

    const confirmed = await confirm({
      title: '確認刪除',
      description: '確定要刪除此區塊嗎？此操作無法復原。',
      variant: 'danger',
    })

    if (!confirmed) return

    setIsSubmitting(true)
    const result = await deleteHomeBlock(blockId)
    setIsSubmitting(false)

    if (!result.success) {
      await alert({
        title: '刪除失敗',
        message: result.message || '刪除區塊失敗',
        variant: 'error',
      })
      return
    }

    await alert({
      title: '刪除成功',
      message: result.message || '區塊刪除成功',
      variant: 'success',
    })

    onSuccess?.()
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">載入中...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基礎欄位 */}
      <div className="space-y-4">
        {/* 區塊名稱 */}
        <div className="space-y-2">
          <label className={`${designTokens.typography.label} text-foreground`}>
            區塊名稱 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：春節促銷活動"
            className={`
              w-full rounded-theme-sm bg-white text-foreground
              ${designTokens.cleanCommerce.border.full}
              ${designTokens.cleanCommerce.shadow.full}
              ${designTokens.input.base}
             
              focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
            required
          />
        </div>

        {/* 區塊類型 */}
        <BlockTypeSelector
          value={blockType}
          onChange={setBlockType}
          disabled={!!blockId || !!presetType} // 編輯模式或預設類型時不可更改
        />

        {/* 是否啟用 */}
        <div className="flex items-center gap-3">
          <label className={`${designTokens.typography.label} text-foreground cursor-pointer`}>
            啟用此區塊
          </label>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`
              relative w-12 h-6 rounded-full border transition-colors
              ${isActive ? 'bg-green-500' : 'bg-gray-300'}
            `}
          >
            <div
              className={`
                absolute top-0.5 left-0.5 w-4 h-4 bg-white border rounded-full transition-transform
                ${isActive ? 'translate-x-6' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </div>

      {/* 條件式欄位 */}
      {(blockType === 'image_carousel' || blockType === 'image_carousel_portrait') && (
        <div className="space-y-4 p-4 border border-dashed border-border rounded">
          <h3 className="font-bold text-lg">
            {blockType === 'image_carousel' ? '圖片輪播設定 (橫向 16:9)' : '海報輪播設定 (直向 4:5)'}
          </h3>

          <ImageUploadMultiple
            blockId={blockId || null}
            images={carouselImages}
            onChange={setCarouselImages}
          />

          <div className="flex items-center gap-3">
            <label className={`${designTokens.typography.label} text-foreground cursor-pointer`}>
              自動播放
            </label>
            <button
              type="button"
              onClick={() => setAutoPlay(!autoPlay)}
              className={`
                relative w-12 h-6 rounded-full border transition-colors
                ${autoPlay ? 'bg-green-500' : 'bg-gray-300'}
              `}
            >
              <div
                className={`
                  absolute top-0.5 left-0.5 w-4 h-4 bg-white border rounded-full transition-transform
                  ${autoPlay ? 'translate-x-6' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          <div className="space-y-2">
            <label className={`${designTokens.typography.label} text-foreground`}>
              輪播間隔（毫秒）
            </label>
            <input
              type="number"
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              min={1000}
              step={1000}
              className={`
                w-full rounded-theme-sm bg-white text-foreground
                ${designTokens.cleanCommerce.border.base}
                px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            />
            <p className="text-xs text-gray-600">
              建議設定 3000-8000 毫秒（3-8 秒）
            </p>
          </div>
        </div>
      )}

      {blockType === 'product_display' && (
        <div className="space-y-4 p-4 border border-dashed border-border rounded">
          <h3 className="font-bold text-lg">商品展示設定</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`${designTokens.typography.label} text-foreground`}>
                篩選系列（可選）
              </label>
              {selectedSeriesIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSeriesIds([])}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                >
                  清除選擇 ({selectedSeriesIds.length})
                </button>
              )}
            </div>
            <select
              multiple
              value={selectedSeriesIds}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions)
                setSelectedSeriesIds(options.map((o) => o.value))
              }}
              className={`
                w-full rounded-theme-sm bg-white text-foreground
                ${designTokens.cleanCommerce.border.base}
                px-3 py-2 min-h-[120px]
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            >
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600">
              按住 Ctrl (Windows) 或 Command (Mac) 可多選
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`${designTokens.typography.label} text-foreground`}>
                篩選標籤（可選）
              </label>
              {selectedTagIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTagIds([])}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                >
                  清除選擇 ({selectedTagIds.length})
                </button>
              )}
            </div>
            <select
              multiple
              value={selectedTagIds}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions)
                setSelectedTagIds(options.map((o) => o.value))
              }}
              className={`
                w-full rounded-theme-sm bg-white text-foreground
                ${designTokens.cleanCommerce.border.base}
                px-3 py-2 min-h-[120px]
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            >
              {tags.map((tagName) => (
                <option key={tagName} value={tagName}>
                  {tagName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className={`${designTokens.typography.label} text-foreground`}>
              最大顯示數量（可選）
            </label>
            <input
              type="number"
              value={maxItems ?? ''}
              onChange={(e) => setMaxItems(e.target.value === '' ? null : Number(e.target.value))}
              min={1}
              placeholder="不填入則不限制數量"
              className={`
                w-full rounded-theme-sm bg-white text-foreground
                ${designTokens.cleanCommerce.border.base}
                px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            />
            <p className="text-xs text-gray-600">
              不填入則顯示所有符合條件的商品，填入則限制顯示數量（最少 1 個）
            </p>
          </div>
        </div>
      )}

      {blockType === 'text_block' && (
        <div className="space-y-4 p-4 border border-dashed border-border rounded">
          <h3 className="font-bold text-lg">文字區塊設定</h3>

          <div className="space-y-2">
            <label className={`${designTokens.typography.label} text-foreground`}>
              文字內容 <span className="text-red-600">*</span>
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              maxLength={1000}
              rows={5}
              placeholder="輸入要顯示的文字內容..."
              className={`
                w-full rounded-theme-sm bg-white text-foreground
                ${designTokens.cleanCommerce.border.base}
                px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
              required
            />
            <p className="text-xs text-gray-600">
              {textContent.length} / 1000 字元
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={`${designTokens.typography.label} text-foreground`}>
                字體大小
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as any)}
                className={`
                  w-full rounded-theme-sm bg-white text-foreground
                  ${designTokens.cleanCommerce.border.base}
                  px-3 py-2
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                `}
              >
                <option value="12">12px</option>
                <option value="16">16px</option>
                <option value="20">20px</option>
                <option value="24">24px</option>
                <option value="32">32px</option>
                <option value="40">40px</option>
                <option value="48">48px</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className={`${designTokens.typography.label} text-foreground`}>
                字體顏色
              </label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className={`
                  w-full h-10 rounded-theme-sm bg-white cursor-pointer
                  ${designTokens.cleanCommerce.border.base}
                 
                `}
              />
            </div>
          </div>

          {/* 預覽 */}
          <div className="space-y-2">
            <label className={`${designTokens.typography.label} text-foreground`}>
              預覽
            </label>
            <div
              className={`
                p-4 bg-white
                ${designTokens.cleanCommerce.border.base}
               
              `}
            >
              <p
                className="text-center"
                style={{
                  fontSize: `${fontSize}px`,
                  color: textColor,
                }}
              >
                {textContent || '尚未輸入文字內容'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 按鈕 */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`
            flex-1 py-3 rounded-theme-sm font-medium
            bg-green-500 text-white
            ${designTokens.cleanCommerce.border.full}
            ${designTokens.cleanCommerce.shadow.full}
           
            hover:-translate-y-0.5 hover:shadow-theme-hover
            transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              儲存中...
            </span>
          ) : (
            '儲存區塊'
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={`
              px-6 py-3 rounded-theme-sm font-medium
              bg-gray-300 text-black
              ${designTokens.cleanCommerce.border.full}
              ${designTokens.cleanCommerce.shadow.full}
             
              hover:-translate-y-0.5 hover:shadow-theme-hover
              transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            取消
          </button>
        )}

        {blockId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className={`
              px-6 py-3 rounded-theme-sm font-medium
              bg-red-600 text-white
              ${designTokens.cleanCommerce.border.full}
              ${designTokens.cleanCommerce.shadow.full}
             
              hover:-translate-y-0.5 hover:shadow-theme-hover
              transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            刪除
          </button>
        )}
      </div>
    </form>
  )
}
