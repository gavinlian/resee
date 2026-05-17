# AI-Parse 云函数

调用 AI（通义千问/硅基流动）解析 OCR 文本，提取人物信息和关系。

## 输入

```json
{
  "text": "OCR识别文本",
  "context": "族谱背景信息（如姓氏、地区）"
}
```

## 输出

```json
{
  "persons": [
    {
      "name": "张三",
      "gender": "male",
      "birth_year": "1980",
      "generation": 12,
      "confidence": 0.85
    }
  ],
  "relations": [
    { "from": "张三", "to": "张四", "type": "父子", "confidence": 0.85 }
  ]
}
```