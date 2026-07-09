import { TextAttributes } from '@opentui/core'

const ITEMS = Array.from({ length: 50 }, (_, i) => `Item ${i}`)

export function ScrollboxTest() {
  return (
    // <box flexDirection="column" width="100%" height="100%" padding={1}>
    //   <text attributes={TextAttributes.BOLD} fg="#00FFFF" marginBottom={1}>
    //     ScrollBox 测试 — 50 items, height=20
    //   </text>

    <scrollbox
      width="100%"
      height={20}
      borderStyle="single"
      borderColor="#555"
      backgroundColor="#1a1a2e"
      horizontalScrollbarOptions={{ visible: false, height: 0 }}
    >
      {ITEMS.map((item, i) => (
        <box
          key={i}
          flexDirection="row"
          height={1}
          backgroundColor={i % 2 === 0 ? '#292e42' : '#2f3449'}
        >
          <text fg="#CCC">{item}</text>
        </box>
      ))}
    </scrollbox>

    //   <text attributes={TextAttributes.DIM} marginTop={1}>
    //     观察：滚动条和内容区域是否对齐 · 能否拖动滚动条 · 键盘上下滚动是否正常
    //   </text>
    // </box>
  )
}
