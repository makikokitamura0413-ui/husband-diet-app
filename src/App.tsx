import { useData, useStoreStatus } from './lib/store';
import { useRoute } from './lib/router';
import { todayKey } from './lib/date';
import { TabBar } from './components/Layout';
import Setup from './screens/Setup';
import Home from './screens/Home';
import CalendarScreen from './screens/Calendar';
import DayDetail from './screens/DayDetail';
import MealForm from './screens/MealForm';
import ExerciseForm from './screens/ExerciseForm';
import WeightForm from './screens/WeightForm';
import MonthSummaryScreen from './screens/MonthSummary';
import WeightGraph from './screens/WeightGraph';
import ProtectScreen from './screens/ProtectScreen';
import { NoticeBar } from './components/NoticeBar';

const isDate = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default function App() {
  const data = useData();
  const { status } = useStoreStatus();
  const { path, query } = useRoute();

  // 保存データを読み込めなかったときは保護モード（初期設定・保存は一切できない）
  if (status === 'error') return <ProtectScreen />;

  // 初回は設定画面を必ず通す
  if (!data.settings)
    return (
      <div className="app">
        <NoticeBar />
        <Setup firstRun />
      </div>
    );

  const [page, arg] = path;
  const date = isDate(arg) ? arg : todayKey();
  let screen;
  let tab = page ?? 'home';
  switch (page) {
    case 'calendar':
      screen = <CalendarScreen month={query.get('m')} />;
      break;
    case 'day':
      screen = <DayDetail date={date} />;
      tab = 'calendar';
      break;
    case 'meal':
      screen = <MealForm date={date} editId={query.get('id')} />;
      break;
    case 'exercise':
      screen = <ExerciseForm date={date} editId={query.get('id')} />;
      break;
    case 'weight':
      screen = <WeightForm date={date} />;
      break;
    case 'summary':
      screen = <MonthSummaryScreen month={query.get('m')} />;
      break;
    case 'graph':
      screen = <WeightGraph />;
      break;
    case 'settings':
      screen = <Setup />;
      break;
    default:
      screen = <Home />;
      tab = 'home';
  }
  const isForm = page === 'meal' || page === 'exercise' || page === 'weight';
  return (
    <div className="app">
      <NoticeBar />
      <main className="main">{screen}</main>
      {!isForm && <TabBar active={tab} />}
    </div>
  );
}
