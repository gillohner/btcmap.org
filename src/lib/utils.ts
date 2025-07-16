import { theme, areas } from '$lib/store';
import { areasSync } from '$lib/sync/areas';
import type { Continents, Element, Grade, IssueIcon } from '$lib/types';
import { toast } from '@zerodevx/svelte-toast';
import type { Chart } from 'chart.js';
import { get } from 'svelte/store';
import rewind from '@mapbox/geojson-rewind';
import { geoContains } from 'd3-geo';
import DOMPurify from 'dompurify';
import NDK, { NDKEvent, type NDKFilter } from '@nostr-dev-kit/ndk';
import { decode } from 'nostr-tools/nip19';

export const errToast = (m: string) => {
	toast.push(m, {
		theme: {
			'--toastBarBackground': '#DF3C3C'
		}
	});
};

export const warningToast = (m: string) => {
	toast.push(m, {
		theme: {
			'--toastBarBackground': '#FACA15'
		},
		duration: 10000
	});
};

export const successToast = (m: string) => {
	toast.push(m, {
		theme: {
			'--toastBarBackground': '#22C55E'
		}
	});
};

export function getRandomColor() {
	const letters = '0123456789ABCDEF';
	let color = '#';
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

export const detectTheme = () => {
	if (
		localStorage.theme === 'dark' ||
		(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
	) {
		return 'dark';
	} else {
		return 'light';
	}
};

export const updateChartThemes = (
	charts: Chart<'line' | 'bar', number[] | undefined, string>[]
) => {
	if (get(theme) === 'dark') {
		charts.forEach((chart) => {
			if (chart.options.scales?.x?.grid && chart.options.scales?.y?.grid) {
				chart.options.scales.x.grid.color = 'rgba(255, 255, 255, 0.15)';
				chart.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.15)';
				chart.update();
			}
		});
	} else {
		charts.forEach((chart) => {
			if (chart.options.scales?.x?.grid && chart.options.scales?.y?.grid) {
				chart.options.scales.x.grid.color = 'rgba(0, 0, 0, 0.1)';
				chart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.1)';
				chart.update();
			}
		});
	}
};

export const formatElementID = (id: string) => {
	const elementIdSplit = id.split(':');
	const elementIdFormatted =
		elementIdSplit[0].charAt(0).toUpperCase() +
		elementIdSplit[0].slice(1, elementIdSplit[0].length) +
		' ' +
		elementIdSplit[1];

	return elementIdFormatted;
};

export const getGrade = (upToDatePercent: number): Grade => {
	switch (true) {
		case upToDatePercent >= 95:
			return 5;
		case upToDatePercent >= 75:
			return 4;
		case upToDatePercent >= 50:
			return 3;
		case upToDatePercent >= 25:
			return 2;
		case upToDatePercent >= 0:
		default:
			return 1;
	}
};

export const getIssueIcon = (issue_code: string): IssueIcon => {
	if (issue_code.startsWith('invalid_tag_value')) {
		return 'fa-calendar-days';
	}
	if (issue_code.startsWith('misspelled_tag_name')) {
		return 'fa-spell-check';
	}
	if (issue_code == 'missing_icon') {
		return 'fa-icons';
	}
	if (issue_code == 'not_verified') {
		return 'fa-clipboard-question';
	}
	if (issue_code == 'outdated') {
		return 'fa-hourglass-end';
	}
	if (issue_code == 'outdated_soon') {
		return 'fa-hourglass-half';
	}
	return 'fa-list-check';
};

export const getIssueHelpLink = (issue_code: string) => {
	if (issue_code == 'outdated' || issue_code == 'outdated_soon' || issue_code == 'not_verified') {
		return 'https://gitea.btcmap.org/teambtcmap/btcmap-general/wiki/Verifying-Existing-Merchants';
	}
	if (issue_code.startsWith('invalid_tag_value')) {
		return 'https://gitea.btcmap.org/teambtcmap/btcmap-general/wiki/Tagging-Merchants#tagging-guidance';
	}
	if (issue_code.startsWith('misspelled_tag_name')) {
		return 'https://gitea.btcmap.org/teambtcmap/btcmap-general/wiki/Tagging-Merchants#tagging-guidance';
	}
	return undefined;
};

export const isEven = (number: number) => {
	return number % 2 === 0;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function debounce(func: (e?: any) => void, timeout = 500) {
	let timer: ReturnType<typeof setTimeout>;
	// @ts-expect-error: introducing typecheck, this was failing, so ingoring for now
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			// @ts-expect-error: introducing typecheck, this was failing, so ingoring for now
			func.apply(this, args);
		}, timeout);
	};
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const validateContinents = (continent: Continents) =>
	[
		'africa',
		'asia',
		'europe',
		'north-america',
		'oceania',
		'south-america',
		'Africa',
		'Asia',
		'Europe',
		'North America',
		'Oceania',
		'South America'
	].includes(continent);

export const isBoosted = (element: Element) =>
	element.tags['boost:expires'] && Date.parse(element.tags['boost:expires']) > Date.now();

export async function getAreaIdsByCoordinates(lat: number, long: number): Promise<string[]> {
	console.debug('Checking areas with coordinates:', { lat, long });
	await areasSync(); // Get latest areas
	const allAreas = get(areas);
	console.debug('Total areas to check:', allAreas.length);

	return allAreas
		.filter((area) => {
			if (!area.tags.geo_json) {
				console.warn('Area missing geo_json:', area.id);
				return false;
			}
			const rewoundPoly = rewind(area.tags.geo_json, true);
			const contains = geoContains(rewoundPoly, [long, lat]);
			if (contains) {
				console.debug('Found matching area:', area.id);
			}
			return contains;
		})
		.map((area) => area.id);
}

export const formatOpeningHours = (str: string): string => {
	const html = str
		.split(/;\s*/)
		.map((part) => `<span>${part.trim()}</span>`)
		.join('');

	return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['span'] });
};

export async function fetchMeetups(
	naddr: string,
	relays: string[] = ['wss://relay.damus.io', 'wss://relay.snort.social', 'wss://relay.mostr.pub']
): Promise<NDKEvent[]> {
	console.log('fetchMeetups called with naddr:', naddr);

	// 1. Decode the naddr → { pubkey, identifier, kind, relays? }
	const { type, data } = decode(naddr) as {
		type: 'naddr';
		data: { pubkey: string; identifier: string; kind: number; relays?: string[] };
	};
	console.log('Decoded naddr:', { type, data });

	if (type !== 'naddr') {
		console.error('Invalid naddr type:', type);
		return [];
	}

	const { pubkey, identifier } = data;

	// 2. Bootstrap NDK
	const relayUrls = Array.from(new Set([...(relays || []), ...(data.relays || [])]));
	const ndk = new NDK({
		explicitRelayUrls: relayUrls
	});
	console.log('Connecting to NDK with relays:', relayUrls);
	ndk.connect();
	console.log('NDK connected');

	// 3. First, fetch the calendar (kind 31924) to get event references
	const calendarSub = ndk.subscribe(
		{
			kinds: [31924 as any], // Calendar kind
			authors: [pubkey],
			'#d': [identifier] // Calendar identifier
		},
		{ closeOnEose: true }
	);

	const calendar = await new Promise<NDKEvent | null>((resolve) => {
		let calendarEvent: NDKEvent | null = null;
		calendarSub.on('event', (ev) => {
			console.log('Received calendar event:', ev);
			calendarEvent = ev;
		});
		calendarSub.on('eose', () => {
			console.log('Calendar subscription ended. Found calendar:', !!calendarEvent);
			resolve(calendarEvent);
		});
	});

	if (!calendar) {
		console.log('No calendar found');
		return [];
	}

	// 4. Extract 'a' tags from the calendar to get event references
	const allATags = calendar.tags.filter((tag) => tag[0] === 'a').map((tag) => tag[1]);
	console.log('All a tags:', allATags);

	const eventRefs = allATags.filter((ref) => {
		if (!ref) return false;
		// Check if the reference starts with the event kinds we're looking for
		const isEvent = ref.startsWith('31922:') || ref.startsWith('31923:') || ref.startsWith('31925:');
		console.log(`Checking ref "${ref}": ${isEvent}`);
		return isEvent;
	});

	console.log('Found event references:', eventRefs);

	if (eventRefs.length === 0) {
		console.log('No event references found in calendar');
		return [];
	}

	// 5. Build filters for the referenced events
	const eventFilters: NDKFilter[] = eventRefs.map((ref) => {
		const [kind, author, dTag] = ref.split(':');
		return {
			kinds: [parseInt(kind) as any],
			authors: [author],
			'#d': [dTag]
		};
	});

	// 6. Fetch all referenced events
	const eventsSub = ndk.subscribe(eventFilters, { closeOnEose: true });

	const events = await new Promise<NDKEvent[]>((resolve) => {
		const evs: NDKEvent[] = [];
		eventsSub.on('event', (ev) => {
			console.log('Received event:', ev);
			evs.push(ev);
		});
		eventsSub.on('eose', () => {
			console.log('Events subscription ended. Found events:', evs.length);
			resolve(evs);
		});
	});

	// 7. Filter for future events only and sort by start date
	const now = Math.floor(Date.now() / 1000);
	const futureEvents = events.filter((ev) => {
		const startTag = ev.tagValue('start');
		if (!startTag) return false;

		// Handle both timestamp and ISO date formats
		const startTime = isNaN(Number(startTag))
			? Math.floor(new Date(startTag).getTime() / 1000)
			: parseInt(startTag);

		return startTime > now;
	});

	// 8. Sort by start date (earliest first)
	futureEvents.sort((a, b) => {
		const aStart = getEventStartTime(a);
		const bStart = getEventStartTime(b);
		return aStart - bStart;
	});

	console.log('Returning future events:', futureEvents.length);
	return futureEvents;
}

function getEventStartTime(event: NDKEvent): number {
	const startTag = event.tagValue('start');
	if (!startTag) return event.created_at || 0;

	// Handle both timestamp and ISO date formats
	return isNaN(Number(startTag))
		? Math.floor(new Date(startTag).getTime() / 1000)
		: parseInt(startTag);
}
