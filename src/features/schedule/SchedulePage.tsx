import { useAuth } from '../auth/AuthContext'
import BartenderSchedule from './BartenderSchedule'
import ManagerSchedule from './ManagerSchedule'

export default function SchedulePage() {
  const { isManager } = useAuth()
  return isManager ? <ManagerSchedule /> : <BartenderSchedule />
}
