import {
  ComponentInstance,
  createVNode, fromEvent, Selection,
  Slot,
  Textbus
} from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { ComponentLoader, DomAdapter, Input } from '@textbus/platform-browser'
import { inject, onMounted, onUnmounted, onUpdated, createSignal, createRef } from '@viewfly/core'
import { useProduce } from '@viewfly/hooks'

import './table.component.scss'
import { ComponentToolbar } from '../../../components/component-toolbar/component-toolbar'
import { ToolbarItem } from '../../../components/toolbar-item/toolbar-item'
import { TableCellConfig, tableComponent } from './table.component'


export function TableComponentView(props: ViewComponentProps<typeof tableComponent>) {
  const adapter = inject(DomAdapter)
  const selection = inject(Selection)
  const isFocus = createSignal(false)
  const subscription = props.component.extends.focus.subscribe(b => {
    isFocus.set(b)
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  const tableRef = createRef<HTMLTableElement>()
  const vBarRef = createRef<HTMLTableElement>()
  const scrollRef = createRef<HTMLDivElement>()
  const wrapperRef = createRef<HTMLDivElement>()
  const dragLineRef = createRef<HTMLDivElement>()

  let activeCol: number | null = null

  onMounted(() => {
    let isDrag = false
    const subscription = fromEvent<MouseEvent>(tableRef.current!, 'mousemove').subscribe(ev => {
      if (isDrag) {
        return
      }
      const tableRect = tableRef.current!.getBoundingClientRect()
      const leftDistance = ev.clientX - tableRect.x
      const state = props.component.state
      let x = 0
      for (let i = 0; i < state.layoutWidth.length; i++) {
        const n = leftDistance - x
        if (i > 0 && Math.abs(n) < 5) {
          Object.assign(dragLineRef.current!.style, {
            left: x + 'px',
            display: 'block'
          })
          activeCol = i
          break
        }
        activeCol = null
        dragLineRef.current!.style.display = 'none'
        x += state.layoutWidth[i]
      }
    }).add(fromEvent<MouseEvent>(dragLineRef.current!, 'mousedown').subscribe(downEvent => {
      isDrag = true
      wrapperRef.current!.style.userSelect = 'none'

      const x = downEvent.clientX
      const layoutWidth = props.component.state.layoutWidth
      const initWidth = layoutWidth[activeCol! - 1]

      const initLeft = layoutWidth.slice(0, activeCol!).reduce((a, b) => a + b, 0)

      const minWidth = 30
      const minLeft = initLeft - initWidth + minWidth

      const moveEvent = fromEvent<MouseEvent>(document, 'mousemove').subscribe(moveEvent => {
        const distanceX = moveEvent.clientX - x

        dragLineRef.current!.style.left = Math.max(initLeft + distanceX, minLeft) + 'px'
        props.component.updateState(draft => {
          draft.layoutWidth[activeCol! - 1] = Math.max(initWidth + distanceX, minWidth)
        }, false)
      }).add(fromEvent<MouseEvent>(document, 'mouseup').subscribe(upEvent => {
        isDrag = false
        wrapperRef.current!.style.userSelect = 'auto'
        moveEvent.unsubscribe()
        const distanceX = upEvent.clientX - x
        props.component.updateState(draft => {
          draft.layoutWidth[activeCol! - 1] = Math.max(initWidth + distanceX, minWidth)
        })
      }))
    }))

    return () => {
      subscription.unsubscribe()
    }
  })

  onUpdated(() => {
    const vBarRows = vBarRef.current!.rows
    Array.from(tableRef.current!.rows).forEach((tr, i) => {
      return vBarRows.item(i)!.style.height = tr.getBoundingClientRect().height + 'px'
    })
  })


  const [showShadow, updateShowShadow] = useProduce({
    leftEnd: false,
    rightEnd: false
  })

  const input = inject(Input)

  onMounted(() => {
    const el = scrollRef.current!

    function update() {
      if (isFocus()) {
        input.caret.refresh(false)
      }
      updateShowShadow(draft => {
        draft.leftEnd = el.scrollLeft === 0
        draft.rightEnd = el.scrollLeft === el.scrollWidth - el.offsetWidth
      })
    }

    update()
    const s = fromEvent(el, 'scroll').subscribe(update)
    return () => s.unsubscribe()
  })

  const selectedColumnRange = createSignal<null | { startIndex: number, endIndex: number }>(null)

  let isSelectColumn = false
  let maskActive = false

  function selectColumn(index: number, isMultiple: boolean) {
    isSelectColumn = true
    maskActive = true
    const currentSelectedColumnRange = selectedColumnRange()
    if (isMultiple && currentSelectedColumnRange) {
      selectedColumnRange.set({
        startIndex: currentSelectedColumnRange.startIndex,
        endIndex: index
      })

    } else {
      selectedColumnRange.set({
        startIndex: index, endIndex: index
      })
    }

    const range = selectedColumnRange()!
    const [startIndex, endIndex] = [range.startIndex, range.endIndex].sort((a, b) => a - b)

    const selectedSlots: Slot[] = []
    const rows = toRows()
    rows.forEach(row => {
      selectedSlots.push(...row.slice(startIndex, endIndex + 1))
    })
    selection.setSelectedRanges(selectedSlots.map(i => {
      return {
        slot: i,
        startIndex: 0,
        endIndex: i.length
      }
    }))
  }

  const selectionChangeSubscription = selection.onChange.subscribe(() => {
    if (maskActive) {
      maskActive = false
      return
    }
    selectedColumnRange.set(null)
  })

  onUnmounted(() => {
    selectionChangeSubscription.unsubscribe()
  })

  function toRows() {
    const { slots, state } = props.component
    const rows: Slot<TableCellConfig>[][] = []

    for (let i = 0; i < state.rowCount; i++) {
      rows.push(slots.slice(i * state.colCount, (i + 1) * state.colCount))
    }

    return rows
  }

  return () => {
    const state = props.component.state
    const rows = toRows()

    Promise.resolve().then(() => {
      props.component.extends.afterContentCheck()
    })

    const currentSelectedColumnRange = selectedColumnRange()
    const currentSelectedColumnRangeSorted = currentSelectedColumnRange ? [currentSelectedColumnRange.startIndex, currentSelectedColumnRange.endIndex].sort((a, b) => a - b) : null
    return (
      <div class="xnote-table" data-component={props.component.name} ref={props.rootRef}>
        <div class="xnote-table-toolbar">
          <ComponentToolbar visible={isFocus()}>
            <ToolbarItem>
              fda
            </ToolbarItem>
          </ComponentToolbar>
        </div>
        <div ref={wrapperRef} class="xnote-table-wrapper">
          <div class={['xnote-table-bar-v', { active: isFocus() }]}>
            <div class="xnote-table-selector"/>
            <table ref={vBarRef} class="xnote-table-bar">
              <tbody>
              {
                state.layoutHeight.map(i => {
                  return <tr style={{ height: i + 'px' }}>
                    <td/>
                  </tr>
                })
              }
              </tbody>
            </table>
          </div>
          <div ref={scrollRef} class={[
            'xnote-table-wrapper-h',
            {
              'left-end': showShadow().leftEnd,
              'right-end': showShadow().rightEnd,
              'active': isFocus(),
              'hide-selection': selectedColumnRange()
            }
          ]}>
            <div class="xnote-table-container">
              <div class={['xnote-table-bar-h', { active: isFocus() }]}>
                <table class="xnote-table-bar">
                  <tbody>
                  <tr>
                    {
                      state.layoutWidth.map((i, index) => {
                        return <td onMousedown={ev => {
                          selectColumn(index, ev.shiftKey)
                        }} class={{
                          active: currentSelectedColumnRangeSorted ? index >= currentSelectedColumnRangeSorted[0] && index <= currentSelectedColumnRangeSorted[1] : null
                        }} style={{ width: i + 'px', minWidth: i + 'px' }}></td>
                      })
                    }
                  </tr>
                  </tbody>
                </table>
              </div>
              <table ref={tableRef} class="xnote-table-content">
                <colgroup>
                  {
                    state.layoutWidth.map(w => {
                      return <col style={{ width: w + 'px', minWidth: w + 'px' }}/>
                    })
                  }
                </colgroup>
                <tbody>
                {
                  rows.map((row, i) => {
                    return (
                      <tr style={{ height: state.layoutHeight[i] + 'px' }}>
                        {
                          row.map(cell => {
                            return adapter.slotRender(cell, children => {
                              return createVNode('td', null, children)
                            }, false)
                          })
                        }
                      </tr>
                    )
                  })
                }
                </tbody>
              </table>
              <div class={[
                'xnote-table-selection-mask',
                {
                  active: selectedColumnRange()
                }
              ]} style={isSelectColumn ? {
                width: currentSelectedColumnRangeSorted ? state.layoutWidth.slice(currentSelectedColumnRangeSorted[0], currentSelectedColumnRangeSorted[1] + 1).reduce((a, b) => a + b, 0) + 'px' : '',
                top: 0,
                bottom: 0,
                left: currentSelectedColumnRangeSorted ? state.layoutWidth.slice(0, currentSelectedColumnRangeSorted[0]).reduce((a, b) => a + b, 0) + 'px' : ''
              } : null}/>
              <div ref={dragLineRef} class={['xnote-table-drag-line']}/>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export const tableComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.dataset.component === tableComponent.name
  },
  read(element: HTMLElement, textbus: Textbus): ComponentInstance | Slot | void {
    return tableComponent.createInstance(textbus)
  }
}