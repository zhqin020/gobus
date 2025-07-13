"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
}

export default function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <div className="absolute top-4 left-4 right-20 z-20">
      <div className="rounded-2xl bg-[#1E2228] shadow-lg flex items-center px-4 py-3 border border-[#23272F]">
        <Search className="w-6 h-6 text-[#3DDC97] mr-2" />
        <Input
          className="flex-1 bg-transparent outline-none text-lg text-white placeholder-[#A0AEC0]"
          placeholder="Search address"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      </div>
    </div>
  )
}
