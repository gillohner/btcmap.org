<script lang="ts">
	export let name: string;
</script>

<section id="meetups">
	<div class="w-full rounded-3xl border border-statBorder dark:bg-white/10">
		<h3
			class="border-b border-statBorder p-5 text-center text-lg font-semibold text-primary dark:text-white md:text-left"
		>
			{name || 'BTC Map Area'} Meetups
		</h3>

		<div class="p-5">
			<p class="text-center text-body dark:text-white">
				Meetup information will be displayed here.
			</p>
		</div>
	</div>
</section>