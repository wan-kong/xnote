import { withScopedCSS } from '@viewfly/scoped-css'
import { ButtonHTMLAttributes } from '@viewfly/platform-browser'
import { createSignal, inject, InjectFlags, onUnmounted, Props } from '@viewfly/core'

import css from './button.scoped.scss'
import { DropdownContextService } from '../dropdown/dropdown-context.service'

export interface ButtonProps extends Props, ButtonHTMLAttributes<HTMLButtonElement> {
  highlight?: boolean
  arrow?: boolean
}

export function Button(props: ButtonProps) {
  const dropdownContextService = inject(DropdownContextService, InjectFlags.Optional, null)
  const isActive = createSignal(dropdownContextService?.isOpen || false)
  if (dropdownContextService) {
    const subscription = dropdownContextService.onOpenStateChange.subscribe(b => {
      isActive.set(b)
    })

    onUnmounted(() => {
      subscription.unsubscribe()
    })
  }
  return withScopedCSS(css, () => {
    return (
      <button type="button" class={[
        'btn',
        {
          active: isActive(),
          highlight: props.highlight
        }
      ]} {...props}>
        <span>
          {props.children}
        </span>
        {
          props.arrow && <span class={['btn-arrow', 'xnote-icon-arrow-bottom']}/>
        }
      </button>
    )
  })
}
