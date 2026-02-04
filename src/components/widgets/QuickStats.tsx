import React from 'react';
import { useAppState } from '@/hooks/useAppState';
import {
  CheckSquare,
  Calendar as CalendarIcon,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const QuickStats = React.memo(function QuickStats() {
  const { 
    getTodayEvents, 
    getTodayTodos, 
    getCompletedTodosCount, 
    getTotalTodosCount,
    getGoalsProgress 
  } = useAppState();

  const todayEvents = getTodayEvents();
  const todayTodos = getTodayTodos();
  const completedTodos = getCompletedTodosCount();
  const totalTodos = getTotalTodosCount();
  const goalsProgress = getGoalsProgress();

  const pendingTodos = todayTodos.filter(t => !t.completed).length;
  const todoCompletionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
  const averageGoalProgress = goalsProgress.length > 0 
    ? Math.round(goalsProgress.reduce((acc, g) => acc + g.progress, 0) / goalsProgress.length)
    : 0;

  const stats = [
    {
      label: 'Today\'s Events',
      value: todayEvents.length,
      subtext: todayEvents.length > 0 ? `Next: ${todayEvents[0]?.title}` : 'No events',
      icon: CalendarIcon,
      trend: null
    },
    {
      label: 'Pending Tasks',
      value: pendingTodos,
      subtext: `${todayTodos.filter(t => t.completed).length} completed today`,
      icon: CheckSquare,
      trend: { value: todoCompletionRate, label: 'completion', positive: todoCompletionRate >= 50 }
    },
    {
      label: 'Goal Progress',
      value: `${averageGoalProgress}%`,
      subtext: `${goalsProgress.length} active goals`,
      icon: Target,
      trend: { value: 12, label: 'vs last week', positive: true }
    },
    {
      label: 'Focus Time',
      value: '4.5h',
      subtext: 'Estimated today',
      icon: Clock,
      trend: { value: 8, label: 'vs yesterday', positive: true }
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="group p-4 rounded-lg bg-card border border-border transition-all duration-200"
            style={{
              animationDelay: `${index * 0.05}s`,
              animation: 'slideUp 0.2s ease-out forwards',
              opacity: 0
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{stat.subtext}</p>
                
                {stat.trend && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className={`flex items-center gap-0.5 text-xs ${
                      stat.trend.positive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stat.trend.positive ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {stat.trend.positive ? '+' : '-'}{stat.trend.value}%
                    </div>
                    <span className="text-xs text-muted-foreground">{stat.trend.label}</span>
                  </div>
                )}
              </div>
              
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
