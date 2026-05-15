import * as React from 'react'
import { useState, useCallback } from 'react'
import { ChevronDownIcon, ChevronRightIcon, CheckIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface TreeSelectNode {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  children?: TreeSelectNode[]
}

interface TreeSelectProps {
  nodes: TreeSelectNode[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  triggerClassName?: string
  size?: 'sm' | 'default'
}

function TreeSelectTriggerDisplay({
  nodes,
  value,
  placeholder,
}: {
  nodes: TreeSelectNode[]
  value?: string
  placeholder?: string
}) {
  if (!value) {
    return <span className="text-muted-foreground">{placeholder}</span>
  }

  for (const node of nodes) {
    if (node.value === value) {
      return (
        <span className="flex items-center gap-2">
          {node.icon && <node.icon className="size-4" />}
          {node.label}
        </span>
      )
    }
    if (node.children) {
      for (const child of node.children) {
        if (child.value === value) {
          return (
            <span className="flex items-center gap-2">
              {node.icon && <node.icon className="size-4 text-muted-foreground" />}
              {child.label}
            </span>
          )
        }
      }
    }
  }

  return <span className="text-muted-foreground">{placeholder}</span>
}

function TreeNode({
  node,
  value,
  onSelect,
  expandedNodes,
  onToggle,
}: {
  node: TreeSelectNode
  value?: string
  onSelect: (value: string) => void
  expandedNodes: Set<string>
  onToggle: (value: string) => void
}) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.value)
  const isSelected = value === node.value

  return (
    <div>
      <div
        className={cn(
          'flex w-full items-center rounded-sm text-sm transition-colors hover:bg-accent/50',
          isSelected && 'font-medium'
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            onClick={() => onToggle(node.value)}
            className="flex size-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isExpanded ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="w-8 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.value)}
          className="flex min-h-11 md:min-h-[36px] flex-1 items-center gap-2 rounded-sm py-1.5 pr-2 outline-none"
        >
          {node.icon && (
            <node.icon className={cn('size-4 shrink-0', isSelected ? 'text-foreground' : 'text-muted-foreground')} />
          )}
          <span className="truncate">{node.label}</span>
          {isSelected && <CheckIcon className="ml-auto size-3.5 shrink-0" />}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-3 border-l border-border pl-1">
          {node.children!.map((child) => (
            <TreeNode
              key={child.value}
              node={child}
              value={value}
              onSelect={onSelect}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TreeSelect({
  nodes,
  value,
  onValueChange,
  placeholder = 'Select...',
  className,
  triggerClassName,
  size = 'default',
}: TreeSelectProps) {
  const [open, setOpen] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const handleToggle = useCallback((nodeValue: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeValue)) {
        next.delete(nodeValue)
      } else {
        next.add(nodeValue)
      }
      return next
    })
  }, [])

  const handleSelect = useCallback(
    (nodeValue: string) => {
      onValueChange?.(nodeValue)
      setOpen(false)
    },
    [onValueChange]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "border-input [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            size === 'default' ? 'h-9' : 'h-8',
            triggerClassName
          )}
        >
          <TreeSelectTriggerDisplay
            nodes={nodes}
            value={value}
            placeholder={placeholder}
          />
          <ChevronDownIcon className="size-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={-36}
        className={cn('w-[--radix-popover-trigger-width] min-w-[200px] overflow-hidden p-0', className)}
      >
        <div className="max-h-[min(300px,var(--radix-popover-content-available-height,300px))] overflow-y-auto overscroll-contain p-1">
          {nodes.map((node) => (
            <TreeNode
              key={node.value}
              node={node}
              value={value}
              onSelect={handleSelect}
              expandedNodes={expandedNodes}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { TreeSelect }
