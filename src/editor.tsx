import { ViewflyAdapter, ViewflyVDomAdapter } from '@textbus/adapter-viewfly'
import { createApp, HTMLRenderer, OutputTranslator } from '@viewfly/platform-browser'
import {
  CollaborateSelectionAwarenessDelegate,
  BrowserModule,
  DomAdapter,
  Parser,
  ViewOptions,
  isMobileBrowser, CollaborateCursor
} from '@textbus/platform-browser'
import { CollaborateConfig, CollaborateModule, MessageBus } from '@textbus/collaborate'
import { Component, ContentType, Module, Selection, Slot, Textbus, TextbusConfig } from '@textbus/core'
import { ReflectiveInjector } from '@viewfly/core'

import './assets/icons/style.css'

import {
  AtComponent, atComponentLoader, AtComponentView,
  BlockquoteComponent,
  blockquoteComponentLoader,
  BlockquoteView, deltaToBlock,
  HighlightBoxComponent,
  highlightBoxComponentLoader,
  HighlightBoxView,
  ImageComponent,
  imageComponentLoader,
  ImageView, KatexComponent, katexComponentLoader, KatexComponentView,
  ListComponent,
  listComponentLoader,
  ListComponentView,
  ParagraphComponent,
  paragraphComponentLoader,
  ParagraphView, registerAtShortcut, registerBlockquoteShortcut, registerListShortcut,
  RootComponent,
  rootComponentLoader,
  RootView,
  SourceCodeComponent,
  sourceCodeComponentLoader,
  SourceCodeView,
  TableComponent,
  tableComponentLoader,
  TableComponentView,
  TodolistComponent,
  todolistComponentLoader,
  TodolistView,
  VideoComponent,
  videoComponentLoader,
  VideoView
} from './textbus/components/_api'
import { LeftToolbarPlugin, LinkJump, InlineToolbarPlugin } from './plugins/_api'
import {
  backgroundColorFormatLoader,
  backgroundColorFormatter,
  boldFormatLoader,
  boldFormatter,
  codeFormatLoader,
  codeFormatter,
  colorFormatLoader,
  colorFormatter,
  fontFamilyFormatLoader,
  fontFamilyFormatter,
  fontSizeFormatLoader,
  fontSizeFormatter,
  italicFormatLoader,
  italicFormatter,
  linkFormatLoader,
  linkFormatter,
  registerBoldShortcut,
  registerCodeShortcut,
  registerItalicShortcut,
  registerStrikeThroughShortcut,
  registerUnderlineShortcut,
  strikeThroughFormatLoader,
  strikeThroughFormatter, subscriptFormatLoader, subscriptFormatter, superscriptFormatLoader, superscriptFormatter,
  underlineFormatLoader,
  underlineFormatter
} from './textbus/formatters/_api'
import './textbus/doc.scss'
import { headingAttr, headingAttrLoader, registerHeadingShortcut } from './textbus/attributes/heading.attr'
import { registerTextAlignShortcut, textAlignAttr, textAlignAttrLoader } from './textbus/attributes/text-align.attr'
import { registerTextIndentShortcut, textIndentAttr, textIndentAttrLoader } from './textbus/attributes/text-indent.attr'
import { OutputInjectionToken } from './textbus/injection-tokens'
import { TableSelectionAwarenessDelegate } from './textbus/components/table/table-selection-awareness-delegate'
import { TimelineComponent } from './textbus/components/timeline/timeline.component'
import { timelineComponentLoader, TimelineComponentView } from './textbus/components/timeline/timeline-component.view'
import { StepComponent } from './textbus/components/step/step.component'
import {
  stepComponentLoader,
  StepComponentView
} from './textbus/components/step/step-component.view'
import { cellAlignAttr, cellAlignAttrLoader } from './textbus/attributes/cell-align.attr'
import { XNoteMessageBus } from './xnote-message-bus'
import { cellBackgroundAttr, cellBackgroundAttrLoader } from './textbus/attributes/cell-background.attr'

export interface XNoteCollaborateConfig extends CollaborateConfig {
  userinfo: {
    username: string
    color: string
    id: string
  }
}

/**
 * XNote 配置项
 */
export interface EditorConfig extends TextbusConfig {
  /** 默认 HTML 内容*/
  content?: string,
  /** 协作服务配置 */
  collaborateConfig?: XNoteCollaborateConfig,
  /** 视图配置项 */
  viewOptions?: Partial<ViewOptions>
}

export class Editor extends Textbus {
  translator = new OutputTranslator()
  private host!: HTMLElement
  private vDomAdapter: ViewflyVDomAdapter

  constructor(private editorConfig: EditorConfig = {}) {
    const adapter = new ViewflyAdapter({
      [ParagraphComponent.componentName]: ParagraphView,
      [RootComponent.componentName]: RootView,
      [BlockquoteComponent.componentName]: BlockquoteView,
      [TodolistComponent.componentName]: TodolistView,
      [SourceCodeComponent.componentName]: SourceCodeView,
      [TableComponent.componentName]: TableComponentView,
      [HighlightBoxComponent.componentName]: HighlightBoxView,
      [ListComponent.componentName]: ListComponentView,
      [ImageComponent.componentName]: ImageView,
      [VideoComponent.componentName]: VideoView,
      [AtComponent.componentName]: AtComponentView,
      [KatexComponent.componentName]: KatexComponentView,
      [StepComponent.componentName]: StepComponentView,
      [TimelineComponent.componentName]: TimelineComponentView,
    }, (host, root, injector) => {
      const appInjector = new ReflectiveInjector(injector, [{
        provide: OutputInjectionToken,
        useValue: false
      }])
      const app = createApp(<>
        {root}
        <LinkJump/>
      </>, {
        context: appInjector
      }).mount(host)

      return () => {
        app.destroy()
      }
    })

    const browserModule = new BrowserModule({
      renderTo: (): HTMLElement => {
        return this.host
      },
      useContentEditable: isMobileBrowser(),
      adapter,
      componentLoaders: [
        atComponentLoader,
        sourceCodeComponentLoader,
        listComponentLoader,
        tableComponentLoader,
        imageComponentLoader,
        highlightBoxComponentLoader,
        blockquoteComponentLoader,
        videoComponentLoader,
        todolistComponentLoader,
        katexComponentLoader,
        paragraphComponentLoader,
        stepComponentLoader,
        timelineComponentLoader
      ],
      formatLoaders: [
        backgroundColorFormatLoader,
        boldFormatLoader,
        codeFormatLoader,
        colorFormatLoader,
        fontFamilyFormatLoader,
        fontSizeFormatLoader,
        italicFormatLoader,
        linkFormatLoader,
        strikeThroughFormatLoader,
        underlineFormatLoader,
        subscriptFormatLoader,
        superscriptFormatLoader
      ],
      attributeLoaders: [
        cellBackgroundAttrLoader,
        cellAlignAttrLoader,
        headingAttrLoader,
        textAlignAttrLoader,
        textIndentAttrLoader
      ],
      ...editorConfig.viewOptions
    })

    const modules: Module[] = [browserModule]
    if (editorConfig.collaborateConfig) {
      modules.push(new CollaborateModule(editorConfig.collaborateConfig))
      modules.push({
        providers: [{
          provide: CollaborateSelectionAwarenessDelegate,
          useClass: TableSelectionAwarenessDelegate
        }, {
          provide: XNoteMessageBus,
          useFactory: (selection: Selection, collaborateCursor: CollaborateCursor) => {
            return new XNoteMessageBus(selection, collaborateCursor, editorConfig.collaborateConfig!.userinfo)
          },
          deps: [
            Selection,
            CollaborateCursor
          ]
        }, {
          provide: MessageBus,
          useExisting: XNoteMessageBus
        }]
      })
    }
    const vDomAdapter = new ViewflyVDomAdapter({
      [ParagraphComponent.componentName]: ParagraphView,
      [RootComponent.componentName]: RootView,
      [BlockquoteComponent.componentName]: BlockquoteView,
      [TodolistComponent.componentName]: TodolistView,
      [SourceCodeComponent.componentName]: SourceCodeView,
      [TableComponent.componentName]: TableComponentView,
      [HighlightBoxComponent.componentName]: HighlightBoxView,
      [ListComponent.componentName]: ListComponentView,
      [ImageComponent.componentName]: ImageView,
      [VideoComponent.componentName]: VideoView,
      [AtComponent.componentName]: AtComponentView,
      [KatexComponent.componentName]: KatexComponentView,
      [StepComponent.componentName]: StepComponentView,
      [TimelineComponent.componentName]: TimelineComponentView,
    } as any, (host, root, injector) => {
      const appInjector = new ReflectiveInjector(injector, [{
        provide: OutputInjectionToken,
        useValue: true
      }, {
        provide: DomAdapter,
        useFactory: () => {
          return vDomAdapter
        }
      }])
      const app = createApp(root, {
        context: appInjector,
        nativeRenderer: new HTMLRenderer()
      }).mount(host)

      return () => {
        app.destroy()
      }
    })
    super({
      zenCoding: true,
      additionalAdapters: [vDomAdapter],
      imports: modules,
      components: [
        ImageComponent,
        ParagraphComponent,
        RootComponent,
        BlockquoteComponent,
        TodolistComponent,
        SourceCodeComponent,
        TableComponent,
        HighlightBoxComponent,
        ListComponent,
        VideoComponent,
        AtComponent,
        KatexComponent,
        StepComponent,
        TimelineComponent
      ],
      formatters: [
        backgroundColorFormatter,
        boldFormatter,
        codeFormatter,
        colorFormatter,
        fontFamilyFormatter,
        fontSizeFormatter,
        italicFormatter,
        linkFormatter,
        strikeThroughFormatter,
        underlineFormatter,
        subscriptFormatter,
        superscriptFormatter
      ],
      attributes: [
        cellBackgroundAttr,
        cellAlignAttr,
        headingAttr,
        textAlignAttr,
        textIndentAttr
      ],
      plugins: [
        new LeftToolbarPlugin(),
        new InlineToolbarPlugin()
      ],
      onAfterStartup(textbus: Textbus) {
        registerBoldShortcut(textbus)
        registerCodeShortcut(textbus)
        registerItalicShortcut(textbus)
        registerStrikeThroughShortcut(textbus)
        registerUnderlineShortcut(textbus)

        registerHeadingShortcut(textbus)
        registerTextAlignShortcut(textbus)
        registerTextIndentShortcut(textbus)

        registerAtShortcut(textbus)
        registerListShortcut(textbus)
        registerBlockquoteShortcut(textbus)

      },
      ...editorConfig
    })

    this.vDomAdapter = vDomAdapter
  }

  mount(host: HTMLElement) {
    this.host = host
    let rootComp: Component
    const config = this.editorConfig
    if (config.content) {
      const parser = this.get(Parser)
      const doc = parser.parseDoc(config.content, rootComponentLoader)
      if (doc instanceof Component) {
        rootComp = doc
      } else {
        const content = new Slot([
          ContentType.BlockComponent
        ])
        if (doc instanceof Slot) {
          deltaToBlock(doc.toDelta(), this).forEach(i => {
            content.insert(i)
          })
        }
        rootComp = new RootComponent(this, {
          content
        })
      }
    } else {
      rootComp = new RootComponent(this, {
        content: new Slot([ContentType.BlockComponent])
      })
    }
    return this.render(rootComp)
  }

  getHTML() {
    return this.translator.transform(this.vDomAdapter.host)
  }
}
