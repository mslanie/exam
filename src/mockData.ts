import { GameQuiz, LeaderboardEntry } from './types';

export const INITIAL_GAMES: GameQuiz[] = [
  {
    id: 'game_ielts_vocab',
    title: 'IELTS Writing Task 2 - Essential Academic Vocabulary',
    description: 'Thử thách điền từ vựng Academic Band 7.0+ vào chỗ trống theo ngữ cảnh bài essay.',
    category: 'IELTS Academic',
    isPublished: true,
    passwordType: 'none',
    timePerQuestion: 30,
    createdAt: '21/07/2026',
    totalPlays: 148,
    questions: [
      {
        id: 'q1',
        sentence: 'It is widely believed that technology has a profound _______ on modern educational paradigms.',
        blanks: [
          { id: 'b1', correctAnswer: 'impact', acceptableAnswers: ['effect', 'influence'], hint: 'Từ bắt đầu bằng chữ "i", nghĩa là tác động' }
        ],
        options: ['impact', 'result', 'reason', 'method'],
        explanation: 'Dùng "impact on" hoặc "influence on" để chỉ ảnh hưởng sâu sắc.'
      },
      {
        id: 'q2',
        sentence: 'Governments should allocate more financial _______ to public healthcare and infrastructure.',
        blanks: [
          { id: 'b2', correctAnswer: 'resources', acceptableAnswers: ['funds', 'funding'], hint: 'Nguồn lực tài chính' }
        ],
        options: ['resources', 'taxes', 'debts', 'expenses'],
        explanation: 'Financial resources = nguồn lực tài chính.'
      },
      {
        id: 'q3',
        sentence: 'One effective measure to _______ traffic congestion is expanding public transport networks.',
        blanks: [
          { id: 'b3', correctAnswer: 'alleviate', acceptableAnswers: ['mitigate', 'reduce'], hint: 'Bắt đầu bằng "al...", có nghĩa là giảm nhẹ' }
        ],
        options: ['alleviate', 'increase', 'ignore', 'construct'],
        explanation: 'Alleviate / mitigate congestion = giảm bớt tình trạng ùn tắc.'
      },
      {
        id: 'q4',
        sentence: 'There is a growing _______ among young graduates to pursue remote freelancing careers.',
        blanks: [
          { id: 'b4', correctAnswer: 'tendency', acceptableAnswers: ['trend', 'inclination'], hint: 'Xu hướng / khuynh hướng' }
        ],
        options: ['tendency', 'habit', 'rule', 'doubt'],
        explanation: 'A growing tendency / trend = xu hướng ngày càng tăng.'
      }
    ]
  },
  {
    id: 'game_grammar_tenses',
    title: 'English Verb Tenses & Passive Voice Challenge',
    description: 'Luyện tập chia thì động từ và câu bị động chuẩn ngữ pháp trong giao tiếp & bài thi.',
    category: 'Grammar',
    isPublished: true,
    passwordType: 'static',
    passwordValue: 'LANIE123',
    timePerQuestion: 25,
    createdAt: '20/07/2026',
    totalPlays: 92,
    questions: [
      {
        id: 'gt1',
        sentence: 'By the time Ms. Lanie arrived at the classroom, the students _______ their assignments.',
        blanks: [
          { id: 'gb1', correctAnswer: 'had finished', acceptableAnswers: ['had completed'], hint: 'Thì quá khứ hoàn thành (had + V3)' }
        ],
        options: ['had finished', 'finished', 'have finished', 'were finishing'],
        explanation: 'Hành động hoàn thành trước một thời điểm trong quá khứ dùng Past Perfect.'
      },
      {
        id: 'gt2',
        sentence: 'A new English learning center _______ built in the city center next month.',
        blanks: [
          { id: 'gb2', correctAnswer: 'will be', acceptableAnswers: ['is going to be'], hint: 'Bị động tương lai đơn (will be + V3)' }
        ],
        options: ['will be', 'was', 'has been', 'is'],
        explanation: 'Diễn tả hành động bị động trong tương lai: will be + V3.'
      },
      {
        id: 'gt3',
        sentence: 'If I _______ more time last weekend, I would have joined the Speaking Club.',
        blanks: [
          { id: 'gb3', correctAnswer: 'had had', acceptableAnswers: [], hint: 'Câu điều kiện loại 3 (had + V3)' }
        ],
        options: ['had had', 'have', 'had', 'would have'],
        explanation: 'Điều kiện loại 3 trái với quá khứ: If + S + had + V3.'
      }
    ]
  },
  {
    id: 'game_prep_phrasal',
    title: 'Prepositions & Phrasal Verbs Arena',
    description: 'Game ôn luyện giới từ đi kèm động từ & cụm động từ thông dụng nhất.',
    category: 'Vocabulary',
    isPublished: true,
    passwordType: 'dynamic',
    passwordValue: '882190',
    timePerQuestion: 20,
    createdAt: '22/07/2026',
    totalPlays: 215,
    questions: [
      {
        id: 'p1',
        sentence: 'She prides herself _______ speaking three foreign languages fluently.',
        blanks: [
          { id: 'pb1', correctAnswer: 'on', acceptableAnswers: [], hint: 'Pride oneself ON something' }
        ],
        options: ['on', 'in', 'at', 'with'],
        explanation: 'Cấu trúc: Pride oneself on sth = Tự hào về điều gì.'
      },
      {
        id: 'p2',
        sentence: 'Never give _______ on your dreams, even when facing difficult challenges.',
        blanks: [
          { id: 'pb2', correctAnswer: 'up', acceptableAnswers: [], hint: 'Give UP = từ bỏ' }
        ],
        options: ['up', 'in', 'out', 'away'],
        explanation: 'Give up = Từ bỏ.'
      },
      {
        id: 'p3',
        sentence: 'The teacher called _______ the student to answer the reading comprehension question.',
        blanks: [
          { id: 'pb3', correctAnswer: 'on', acceptableAnswers: ['upon'], hint: 'Call ON someone' }
        ],
        options: ['on', 'for', 'at', 'after'],
        explanation: 'Call on someone = Mời ai đó phát biểu / trả lời.'
      }
    ]
  }
];

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'lb1',
    gameId: 'game_ielts_vocab',
    gameTitle: 'IELTS Writing Task 2 - Essential Academic Vocabulary',
    studentName: 'Nguyễn Văn An',
    score: 100,
    totalQuestions: 4,
    timeSpentSeconds: 48,
    accuracy: 100,
    completedAt: '22/07/2026 08:15'
  },
  {
    id: 'lb2',
    gameId: 'game_ielts_vocab',
    gameTitle: 'IELTS Writing Task 2 - Essential Academic Vocabulary',
    studentName: 'Trần Thị Mai',
    score: 75,
    totalQuestions: 4,
    timeSpentSeconds: 52,
    accuracy: 75,
    completedAt: '22/07/2026 08:22'
  },
  {
    id: 'lb3',
    gameId: 'game_prep_phrasal',
    gameTitle: 'Prepositions & Phrasal Verbs Arena',
    studentName: 'Phạm Bảo Ngọc',
    score: 100,
    totalQuestions: 3,
    timeSpentSeconds: 32,
    accuracy: 100,
    completedAt: '22/07/2026 08:40'
  },
  {
    id: 'lb4',
    gameId: 'game_grammar_tenses',
    gameTitle: 'English Verb Tenses & Passive Voice Challenge',
    studentName: 'Lê Hoàng Minh',
    score: 100,
    totalQuestions: 3,
    timeSpentSeconds: 38,
    accuracy: 100,
    completedAt: '22/07/2026 08:50'
  }
];
