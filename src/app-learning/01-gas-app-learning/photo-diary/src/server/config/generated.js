// 自動生成：src/scripts/build-data.mjs（npm run build:data）。手で直さない。読むのは server/config/settings.js だけ。
// 正本は env/config.yaml・env/sample-data.yaml・env/tags.csv。
const APP_CONFIG = {
  "app": {
    "name": "GAS日記",
    "tagline": "学習用MVP",
    "mark": "日"
  },
  "limits": {
    "title": 120,
    "body": 5000,
    "excerpt": 80,
    "tags": 5
  },
  "ai": {
    "model": "gpt-4.1-mini",
    "maxOutputTokens": 2048
  },
  "uploads": {
    "maxImages": 3,
    "maxBytes": 1048576,
    "maxTotalBytes": 3145728,
    "maxEdge": 1600,
    "retentionHours": 24
  },
  "providers": {
    "photo": "drive",
    "draft": "openai"
  },
  "requestCacheSeconds": 600,
  "lockWaitMs": 10000,
  "retiredSheets": [
    "books"
  ]
}

const APP_DATA = {
  "images": [
    {
      "id": "sample-a",
      "label": "カフェ",
      "hue": 28
    },
    {
      "id": "sample-b",
      "label": "ケーキ",
      "hue": 340
    },
    {
      "id": "sample-c",
      "label": "公園",
      "hue": 125
    },
    {
      "id": "sample-d",
      "label": "海",
      "hue": 200
    },
    {
      "id": "sample-e",
      "label": "夜景",
      "hue": 255
    },
    {
      "id": "sample-f",
      "label": "ごはん",
      "hue": 45
    }
  ],
  "tags": [
    {
      "id": "10",
      "name": "カフェ"
    },
    {
      "id": "11",
      "name": "休日"
    },
    {
      "id": "12",
      "name": "スイーツ"
    },
    {
      "id": "13",
      "name": "旅行"
    },
    {
      "id": "14",
      "name": "料理"
    },
    {
      "id": "15",
      "name": "読書"
    },
    {
      "id": "16",
      "name": "散歩"
    },
    {
      "id": "17",
      "name": "仕事"
    }
  ],
  "samplePosts": [
    {
      "id": "1",
      "title": "カフェに行った",
      "body": "今日はカフェでケーキを食べた。\n窓ぎわの席が空いていて、ゆっくりできた。",
      "hoursAgo": 26,
      "images": [
        {
          "id": "101",
          "file": "sample-a"
        },
        {
          "id": "102",
          "file": "sample-b"
        }
      ],
      "tags": [
        "10",
        "11",
        "12"
      ]
    },
    {
      "id": "2",
      "title": "休日のお出かけ",
      "body": "天気が良かったので、少し遠くの公園まで歩いた。",
      "hoursAgo": 3,
      "images": [
        {
          "id": "103",
          "file": "sample-c"
        }
      ],
      "tags": [
        "11"
      ]
    }
  ],
  "draft": {
    "title": "ゆったり過ごした一日",
    "body": "今日は少し肩の力を抜いて過ごした。\n写真を見返すと、そのときの空気や匂いまで思い出せる。\n明日も、小さな楽しみをひとつ見つけたい。"
  }
}
