import { Props } from '@viewfly/core'
import { createPortal } from '@viewfly/platform-browser'

export interface TeleportProps extends Props {
    target?: HTMLElement
}

export function Teleport(props: TeleportProps) {
    const target = props.target || document.body
  return createPortal(() => {
   return props.children
  },target)
}