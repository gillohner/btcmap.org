<script lang="ts">
	import { onMount } from 'svelte';
	import type { NDKEvent } from '@nostr-dev-kit/ndk';
	import { fetchMeetups } from '$lib/utils';

	export let calendar_naddr: string;

	let loading = true;
	let events: NDKEvent[] = [];
	let error: string | null = null;

	console.log('AreaMeetups component loaded with calendar_naddr:', calendar_naddr);

	onMount(async () => {
		console.log('AreaMeetups onMount called, calendar_naddr:', calendar_naddr);
		try {
			console.log('Fetching meetups...');
			events = await fetchMeetups(calendar_naddr);
			console.log('Fetched events:', events);
		} catch (e) {
			console.error('Error fetching meetups:', e);
			error = 'Could not load meetup data.';
		} finally {
			loading = false;
			console.log('Loading finished. Events:', events.length, 'Error:', error);
		}
	});

	const fmt = (iso: string | undefined, ts = 0) =>
		iso ? new Date(iso).toLocaleString() : new Date(ts * 1000).toLocaleString();
</script>

<div class="w-full rounded-3xl border border-statBorder dark:bg-white/10">
	<h3
		class="border-b border-statBorder p-5 text-center text-lg font-semibold text-primary dark:text-white md:text-left"
	>
		Upcoming Meetups
	</h3>

	{#if loading}
		<div class="p-5 text-center text-body dark:text-white">Loading…</div>
	{:else if error}
		<div class="p-5 text-center text-body dark:text-white">{error}</div>
	{:else if events.length === 0}
		<div class="p-5 text-center text-body dark:text-white">No upcoming meetups.</div>
	{:else}
		<ul class="divide-y divide-statBorder">
			{#each events as ev}
				<li class="p-5 text-left">
					<h4 class="font-semibold">
						{ev.tagValue('title') ?? 'Untitled event'}
					</h4>

					<div class="text-sm text-body">
						{fmt(ev.tagValue('start'), ev.created_at)}
						{#if ev.tagValue('location')}
							&nbsp;•&nbsp;{ev.tagValue('location')}
						{/if}
					</div>

					{#if ev.content}
						<p class="mt-1 line-clamp-3 text-sm text-body">{ev.content}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
