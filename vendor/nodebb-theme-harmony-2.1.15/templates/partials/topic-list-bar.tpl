<!-- Add filtered state indicator -->
<!-- IF isDateFiltered -->
<div class="alert alert-info mb-2 d-flex align-items-center justify-content-between">
	<span><i class="fa fa-calendar me-2"></i>Showing topics from {selectedDate}</span>
</div>
<!-- ENDIF isDateFiltered -->

<div class="{{{ if config.theme.stickyToolbar }}}sticky-tools{{{ end }}} mb-3" style="top: {{{ if (config.theme.topMobilebar && !config.theme.autohideBottombar) }}}var(--panel-offset){{{ else }}}0{{{ end }}};">
	<nav class="topic-list-header d-flex flex-nowrap my-2 p-0 border-0 rounded">
		<div class="d-flex flex-row p-2 text-bg-light gap-1 border rounded w-100">
			<div component="category/controls" class="d-flex me-auto mb-0 gap-2 flex-wrap">
				{{{ if (template.category || template.world) }}}
				<!-- IMPORT partials/category/watch.tpl -->
				<!-- IMPORT partials/tags/filter-dropdown-left.tpl -->
				<!-- IMPORT partials/category/sort.tpl -->
				{{{ end }}}
				{{{ if (template.popular || template.top)}}}
				<!-- IMPORT partials/topic-terms.tpl -->
				{{{ end }}}
				{{{ if (template.unread || (template.recent || (template.popular || template.top))) }}}
				<!-- IMPORT partials/topic-filters.tpl -->
				<!-- IMPORT partials/category/filter-dropdown-left.tpl -->
				<!-- IMPORT partials/tags/filter-dropdown-left.tpl -->
				{{{ end }}}
				{{{ if template.unread }}}
				<div class="markread btn-group {{{ if !topics.length }}}hidden{{{ end }}}">
					<!-- IMPORT partials/category/selector-dropdown-left.tpl -->
				</div>
				{{{ end }}}
				{{{ if template.tag }}}
				<!-- IMPORT partials/category/filter-dropdown-left.tpl -->
				<!-- IMPORT partials/tags/watch.tpl -->
				{{{ end }}}
				<!-- IMPORT partials/category/tools-dropdown-left.tpl -->

				<!-- Date Filter Button -->
				<a 
					id="date-filter"
					class="btn btn-ghost btn-sm"
					title="Date Filtering"
					onclick="toggleDateFilter()">
					<i class="fa fa-calendar text-primary me-2" style="color: blue;"></i>
					<span style="font-weight: 500;">Date Filtering</span>
				</a>

				<!-- Date Filter Form Container -->
				<div id="date-filter-container" class="border rounded bg-light p-2 m-0" style="display: none;">
					<form method="get" class="d-flex align-items-center gap-2">
						<!-- Preserve existing query parameters -->
						<!-- IF query.sort -->
						<input type="hidden" name="sort" value="{query.sort}" />
						<!-- ENDIF query.sort -->
						<!-- IF selectedTag -->
						<input type="hidden" name="tag" value="{selectedTag.value}" />
						<!-- ENDIF selectedTag -->
						<!-- IF query.author -->
						<input type="hidden" name="author" value="{query.author}" />
						<!-- ENDIF query.author -->

						<!-- Date inputs - pre-populated if filtering is active -->
						<input type="number" name="month" class="form-control form-control-sm" style="width: 70px;" placeholder="MM" min="1" max="12" value="{{{ if isDateFiltered }}}{selectedMonth}{{{ end }}}" required />
						<input type="number" name="day" class="form-control form-control-sm" style="width: 70px;" placeholder="DD" min="1" max="31" value="{{{ if isDateFiltered }}}{selectedDay}{{{ end }}}" required />
						<input type="number" name="year" class="form-control form-control-sm" style="width: 85px;" placeholder="YYYY" min="1900" max="2100" value="{{{ if isDateFiltered }}}{selectedYear}{{{ end }}}" required />
						<button type="submit" class="btn btn-primary btn-sm">Filter</button>
					</form>
				</div>

				{{{ if (!feeds:disableRSS && rssFeedUrl) }}}
				<a class="btn btn-ghost btn-sm d-none d-lg-flex align-items-center justify-content-center" target="_blank" href="{rssFeedUrl}" itemprop="item" title="[[global:rss-feed]]"><i class="fa fa-rss text-primary"></i></a>
				{{{ end }}}

				<a href="{{{ if (template.category || template.world) }}}{url}{{{ else }}}{config.relative_path}/{selectedFilter.url}{querystring}{{{ end }}}" class="btn btn-secondary fw-semibold position-absolute top-100 translate-middle-x start-50 mt-1 hide" style="--bs-btn-padding-y: .25rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;" id="new-topics-alert">
					<i class="fa fa-fw fa-arrow-up"></i> [[recent:load-new-posts]]
				</a>
			</div>

			<div class="d-flex gap-1 align-items-center">
				{{{ if (template.category || template.world) }}}
					{{{ if privileges.topics:create }}}
					<a href="{config.relative_path}/compose?cid={cid}" component="category/post" id="new_topic" class="btn btn-primary btn-sm text-nowrap" data-ajaxify="false" role="button">[[category:new-topic-button]]</a>
					{{{ end }}}
				{{{ else }}}
					{{{ if canPost }}}
					<!-- IMPORT partials/buttons/newTopic.tpl -->
					{{{ end }}}
				{{{ end }}}
				<!-- only show login button if not logged in and doesn't have any posting privilege -->
				{{{ if (!loggedIn && (!privileges.topics:create && !canPost))}}}
				<a component="category/post/guest" href="{config.relative_path}/login" class="btn btn-sm btn-primary">[[category:guest-login-post]]</a>
				{{{ end }}}
			</div>
		</div>
	</nav>
</div>

<script>
	function toggleDateFilter() {
		const container = document.getElementById('date-filter-container');
		container.style.display = container.style.display === 'none' ? 'block' : 'none';
	}

	// Show date filter if currently active
	document.addEventListener('DOMContentLoaded', function() {
		const isFiltered = {{{ if isDateFiltered }}}true{{{ else }}}false{{{ end }}};
		if (isFiltered) {
			document.getElementById('date-filter-container').style.display = 'block';
		}
	});
</script>