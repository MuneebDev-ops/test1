import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />
}

function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />
}

function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr data-slot="table-row" className={cn('border-b border-[#f0f4f2] hover:bg-[#fbfdfc]', className)} {...props} />
}

function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      data-slot="table-head"
      className={cn('px-2.5 py-3 text-left text-[11px] font-semibold tracking-[0.08em] text-[#8b98a1] uppercase', className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td data-slot="table-cell" className={cn('px-2.5 py-3.5 align-middle', className)} {...props} />
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
