# S0: зависимости урока для D2

Список включает `components/lesson/*`, `components/workspace/*`, `cabinet/LessonView` и их локальные зависимости по импортам. В таблице показаны прямые зависимости каждого файла; `none` не означает отсутствие транзитивных зависимостей. Компоненты в S0 не переносились.

`LearningLesson` — клиентский координатор: маршрутизация Next, загрузка данных, прогресс, этапы и динамический Workspace. `LessonView` остаётся клиентским адаптером к нему. `Workspace` использует браузерный Worker, Wokwi/custom elements, Canvas, CodeMirror и аудио; его нельзя импортировать в headless-движок. `useLearningStore` хранит черновики в браузере; `useProgress` связывает локальный прогресс, Supabase и серверные начисления. `useStageGate` привязан к URL Next. В D2 этим границам нужны адаптеры приложения, а не перенос Next-сервера внутрь UI.

Серверная часть, не входящая в клиентскую таблицу: `src/app/app/lesson/[lessonId]/page.tsx` — серверная страница Next; `src/app/api/lessons/[lessonId]/route.ts` — доставка материала; `api/lesson-video`, `api/compile`, `api/mentor`, `api/award`, `api/achievements/*` — серверные обработчики. Учебные `flow.ts` и `quiz.ts` остаются на сайте из-за `projects/storage` и `progress/courseState`. Авторизацию, проверку тарифа и выдачу материалов D2 нужно согласовать с актуальным планом; S0 их поведение не меняет.

| File | Direct Next imports | Direct API calls | Browser boundary |
| --- | --- | --- | --- |
| src/components/cabinet/CabinetArt.tsx | next/image | none | none direct |
| src/components/cabinet/CabinetIcon.tsx | none | none | none direct |
| src/components/cabinet/LessonView.tsx | none | none | none direct |
| src/components/feedback/EventFeedback.tsx | none | none | document |
| src/components/icons/AnimatedCount.tsx | none | none | none direct |
| src/components/icons/HintIcon.tsx | none | none | none direct |
| src/components/icons/Icon.tsx | none | none | none direct |
| src/components/icons/NavigationIcon.tsx | none | none | none direct |
| src/components/icons/RewardIcon.tsx | none | none | none direct |
| src/components/icons/SettingsIcon.tsx | none | none | none direct |
| src/components/icons/StreakIcon.tsx | none | none | none direct |
| src/components/icons/ValueIcon.tsx | none | none | none direct |
| src/components/icons/iconTypes.ts | none | none | none direct |
| src/components/lesson/CompletionModal.tsx | none | none | none direct |
| src/components/lesson/LearningLesson.tsx | next/dynamic, next/navigation, next/link | none | window |
| src/components/lesson/LessonQuiz.tsx | none | none | none direct |
| src/components/lesson/LessonShell.tsx | next/link | none | none direct |
| src/components/lesson/LessonSkeleton.tsx | none | none | none direct |
| src/components/lesson/LessonStepper.tsx | none | none | none direct |
| src/components/lesson/StageIndicator.tsx | none | none | none direct |
| src/components/lesson/StageTransition.tsx | none | none | none direct |
| src/components/lesson/TopProgressLine.tsx | none | none | none direct |
| src/components/lesson/VideoStep.tsx | none | /api/lesson-video?lessonId | window, document |
| src/components/lesson/stages/PracticeStage.tsx | none | none | none direct |
| src/components/lesson/stages/QuizStage.tsx | none | none | none direct |
| src/components/lesson/stages/VideoStage.tsx | none | none | none direct |
| src/components/mentor/openMentor.ts | none | none | window |
| src/components/ui/Stagger.tsx | none | none | none direct |
| src/components/workspace/BreadboardElement.ts | none | none | customElements |
| src/components/workspace/Canvas.tsx | none | none | none direct |
| src/components/workspace/CodePanel.tsx | none | none | none direct |
| src/components/workspace/InputControls.tsx | none | none | none direct |
| src/components/workspace/Palette.tsx | none | none | none direct |
| src/components/workspace/PartView.tsx | none | none | document |
| src/components/workspace/Workspace.tsx | next/dynamic | none | document, Worker, AudioContext |
| src/lib/useInViewOnce.ts | none | none | window |
| src/lib/useLearningStore.ts | none | none | window, localStorage |
| src/lib/useLessonData.ts | none | /api/lessons/${encodeURIComponent(id)} | none direct |
| src/lib/useMentorNudge.ts | none | none | none direct |
| src/lib/useProgress.tsx | next/navigation | /api/achievements/claim, /api/award | window, document, localStorage |
| src/lib/useReducedMotion.ts | none | none | window |
| src/lib/useStageGate.ts | next/navigation | none | none direct |
| src/services/achievements/gameQueue.ts | none | /api/achievements/game-attempt | localStorage |
| src/services/compile/cache.ts | none | none | none direct |
| src/services/compile/client.ts | none | /api/compile | none direct |
| src/services/compile/explain.ts | none | none | none direct |
| src/services/mentor/client.ts | none | /api/mentor | none direct |
| src/services/mentor/templates.ts | none | none | none direct |
