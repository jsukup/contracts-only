'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  BarChart3,
  TrendingUp,
  Users,
  Briefcase,
  DollarSign
} from 'lucide-react'

interface ChartData {
  label: string
  value: number
  color?: string
}

interface AnalyticsChartProps {
  title: string
  data: ChartData[]
  type: 'bar' | 'line' | 'pie' | 'area'
  height?: number
  showLegend?: boolean
  valuePrefix?: string
  valueSuffix?: string
  icon?: React.ReactNode
}

export function AnalyticsChart({ 
  title, 
  data, 
  type, 
  height = 300,
  showLegend = true,
  valuePrefix = '',
  valueSuffix = '',
  icon
}: AnalyticsChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))

  const getBarHeight = (value: number) => {
    return (value / maxValue) * 100
  }

  const getColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-yellow-500'
    ]
    return colors[index % colors.length]
  }

  const renderBarChart = () => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 truncate">{item.label}</span>
            <span className="font-medium">
              {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${getColor(index)} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${getBarHeight(item.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )

  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    
    return (
      <div className="flex items-center justify-center">
        <div className="grid grid-cols-2 gap-4 w-full">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1)
            return (
              <div key={item.label} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getColor(index)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {percentage}% ({valuePrefix}{item.value.toLocaleString()}{valueSuffix})
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderLineChart = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-end h-40 space-x-1">
        {data.map((item, index) => (
          <div key={item.label} className="flex-1 flex flex-col items-center">
            <div 
              className={`w-full ${getColor(index)} rounded-t transition-all duration-500`}
              style={{ height: `${getBarHeight(item.value)}%` }}
            />
            <div className="text-xs text-gray-600 text-center mt-2 transform -rotate-45 origin-top">
              {item.label}
            </div>
          </div>
        ))}
      </div>
      
      {showLegend && (
        <div className="grid grid-cols-2 gap-2">
          {data.map((item, index) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${getColor(index)}`} />
                <span className="text-gray-600">{item.label}</span>
              </div>
              <span className="font-medium">
                {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart()
      case 'pie':
        return renderPieChart()
      case 'line':
      case 'area':
        return renderLineChart()
      default:
        return renderBarChart()
    }
  }

  const getIcon = () => {
    if (icon) return icon
    
    switch (type) {
      case 'bar':
        return <BarChart3 className="h-4 w-4" />
      case 'line':
      case 'area':
        return <TrendingUp className="h-4 w-4" />
      case 'pie':
        return <DollarSign className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-medium">
            {getIcon()}
            <span className="ml-2">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center text-sm font-medium">
          {getIcon()}
          <span className="ml-2">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ minHeight: height - 100 }}>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized chart components
export function JobCategoryChart({ data }: { data: Array<{ category: string; count: number }> }) {
  return (
    <AnalyticsChart
      title="Jobs by Category"
      data={data.map(item => ({ label: item.category, value: item.count }))}
      type="bar"
      icon={<Briefcase className="h-4 w-4" />}
    />
  )
}

export function RateDistributionChart({ data }: { data: Array<{ range: string; count: number }> }) {
  return (
    <AnalyticsChart
      title="Hourly Rate Distribution"
      data={data.map(item => ({ label: item.range, value: item.count }))}
      type="pie"
      valuePrefix=""
      valueSuffix=" jobs"
      icon={<DollarSign className="h-4 w-4" />}
    />
  )
}

export function UserGrowthChart({ data }: { data: Array<{ date: string; count: number }> }) {
  return (
    <AnalyticsChart
      title="User Growth (Last 30 Days)"
      data={data.slice(-30).map(item => ({ 
        label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        value: item.count 
      }))}
      type="line"
      valueSuffix=" users"
      icon={<Users className="h-4 w-4" />}
    />
  )
}

export function SkillDistributionChart({ data }: { data: Array<{ skill: string; count: number }> }) {
  return (
    <AnalyticsChart
      title="Top Skills"
      data={data.slice(0, 8).map(item => ({ label: item.skill, value: item.count }))}
      type="bar"
      valueSuffix=" users"
      icon={<TrendingUp className="h-4 w-4" />}
    />
  )
}