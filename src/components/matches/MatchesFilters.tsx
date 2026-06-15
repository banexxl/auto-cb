"use client";

import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { CloudbetSport } from "@/lib/cloudbet/cloudbet-types";

interface MatchesFiltersProps {
  limit: number;
  sport: string;
  sports: CloudbetSport[];
}

function getMatchesUrl(sport: string, limit: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("sport", sport);
  searchParams.set("limit", limit);

  return `/matches?${searchParams.toString()}`;
}

export function MatchesFilters({ limit, sport, sports }: MatchesFiltersProps) {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState(sport);
  const [selectedLimit, setSelectedLimit] = useState(String(limit));

  function handleSportChange(event: SelectChangeEvent<string>) {
    const nextSport = event.target.value;
    setSelectedSport(nextSport);
    router.push(getMatchesUrl(nextSport, selectedLimit));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(getMatchesUrl(selectedSport, selectedLimit));
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        alignItems: "center",
        bgcolor: "common.white",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        p: 2,
      }}
    >
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="sport-select-label">Sport</InputLabel>
        <Select
          label="Sport"
          labelId="sport-select-label"
          name="sport"
          onChange={handleSportChange}
          value={selectedSport}
        >
          {sports.map((sportOption) => (
            <MenuItem key={sportOption.key} value={sportOption.key}>
              {sportOption.name} ({sportOption.eventCount ?? 0})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Limit"
        name="limit"
        onChange={(event) => setSelectedLimit(event.target.value)}
        size="small"
        slotProps={{ htmlInput: { min: 1, max: 10000 } }}
        type="number"
        value={selectedLimit}
      />
      <Button type="submit" variant="contained">Refresh</Button>
    </Box>
  );
}
