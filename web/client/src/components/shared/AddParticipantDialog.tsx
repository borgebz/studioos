/**
 * AddParticipantDialog — shared roster picker used by both the admin
 * CoachingForm and the student/teacher RequestCoachingPage.
 *
 * Stateless about *where* the candidate list comes from — the caller passes
 * `availableStudents` (already filtered to exclude existing participants),
 * the dialog runs a simple in-memory search + multi-select on top.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export interface ParticipantOption {
  id: number
  name: string
  email: string
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'
  )
}

export interface AddParticipantDialogProps {
  open: boolean
  onClose: () => void
  /** Receives the picked students; the caller is responsible for merging them. */
  onAdd: (students: ParticipantOption[]) => void
  /** Candidate students. Already filtered by the caller (e.g. excludes those already on the roster). */
  availableStudents: ParticipantOption[]
}

export function AddParticipantDialog({
  open,
  onClose,
  onAdd,
  availableStudents,
}: AddParticipantDialogProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return availableStudents
    const q = search.toLowerCase()
    return availableStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    )
  }, [availableStudents, search])

  const toggleStudent = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = () => {
    const students = availableStudents.filter((s) => selected.has(s.id))
    onAdd(students)
    setSelected(new Set())
    setSearch('')
  }

  const handleClose = () => {
    setSelected(new Set())
    setSearch('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('coachings.addParticipant')}</DialogTitle>
          <DialogDescription>
            {t('coachings.addParticipantDesc')}
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder={t('coachings.searchStudents')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((student) => (
              <label
                key={student.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-accent"
              >
                <Checkbox
                  checked={selected.has(student.id)}
                  onCheckedChange={() => toggleStudent(student.id)}
                />
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {getInitials(student.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{student.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {student.email}
                  </p>
                </div>
              </label>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('coachings.noStudentsFound')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('coachings.cancel')}
          </Button>
          <Button onClick={handleAdd} disabled={selected.size === 0}>
            {t('coachings.addSelected', { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
