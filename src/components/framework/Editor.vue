<template>
  <div class="editor"></div>
</template>

<script lang="ts">
import * as monaco from 'monaco-editor'
import { Component, Vue, Watch } from 'vue-property-decorator'

@Component({
  name: 'Editor',
  props: {
    value: {
      type: String,
      default: ''
    },
    fontSize: {
      type: Number,
      default: () => (window.devicePixelRatio > 1 ? 12 : 14)
    },
    minimal: {
      type: Boolean,
      default: false
    }
  }
})
export default class extends Vue {
  private value: string
  private fontSize: number

  private editorInstance: any

  private _blurTimeout: number
  private _beforeUnloadHandler: (event: Event) => void

  @Watch('fontSize')
  onFontSizeChange() {
    this.editorInstance.updateOptions({ fontSize: this.fontSize })
  }

  @Watch('value')
  onValueChange(value) {
    this.editorInstance.setValue(value)
  }

  async mounted() {
    this.createEditor()
  }

  beforeDestroy() {
    this.editorInstance.dispose()

    if (this._blurTimeout) {
      this.onBlur()
    }
  }

  resize() {
    this.editorInstance.layout()
  }

  onBlur() {
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      this._beforeUnloadHandler = null
    }
    this.$emit('blur', this.editorInstance.getValue())
  }

  onFocus() {
    if (this._beforeUnloadHandler) {
      return
    }

    this._beforeUnloadHandler = (event: any) => {
      event.preventDefault()
      event.returnValue = ''
      return false
    }
    window.addEventListener('beforeunload', this._beforeUnloadHandler)
  }

  async createEditor() {
    this.editorInstance = monaco.editor.create(this.$el as HTMLElement, {
      value: this.value,
      fontSize: this.fontSize,
      theme:
        this.$store.state.settings.theme === 'light' ? 'vs-light' : 'vs-dark'
    })
    this.editorInstance.onDidBlurEditorText(() => {
      if (this._blurTimeout) {
        clearTimeout(this._blurTimeout)
      }

      this._blurTimeout = setTimeout(() => {
        this.onBlur()
        this._blurTimeout = null
      }, 100) as unknown as number
    })
    this.editorInstance.onDidFocusEditorText(() => {
      if (this._blurTimeout) {
        clearTimeout(this._blurTimeout)
        this._blurTimeout = null
      }

      this.onFocus()
    })
    /*this.editorInstance = monaco
    ;(window as any).editorInstance = this.editorInstance
    this.editorInstance.renderer.setPadding(8)
    this.editorInstance.renderer.setScrollMargin(8, 0, 0, 0)
    this.editorInstance.container.style.lineHeight = 1.25

    this.editorInstance.setKeyboardHandler('ace/keyboard/vscode')

    this.editorInstance.on('blur', () => {
      if (this._blurTimeout) {
        clearTimeout(this._blurTimeout)
      }

      this._blurTimeout = setTimeout(() => {
        this.onBlur()
        this._blurTimeout = null
      }, 100) as unknown as number
    })

    this.editorInstance.on('focus', () => {
      if (this._blurTimeout) {
        clearTimeout(this._blurTimeout)
        this._blurTimeout = null
      }

      this.onFocus()
    })

    this.editorInstance.on('change', () => {
      this.$emit('input', this.editorInstance.getValue())
    })

    await this.$nextTick()

    this.editorInstance.focus()*/
  }
}
</script>

<style lang="scss">
.editor {
  width: 100%;
  height: 100%;
  min-height: 50px;
}
</style>
