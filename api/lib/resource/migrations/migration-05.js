import database from '../database';

const migrateDesignDoc = async () => {
	// Update design document.
	const ddoc = await database.get('_design/monitool');

	ddoc.views.projects_short = {
		map: function(doc) {
			if (doc.type === 'project') {
				emit(doc._id, {
					_id: doc._id,
					country: doc.country,
					name: doc.name,
					start: doc.start, end: doc.end,
					users: doc.users.map(function(user) {
						return {type: user.type, id: user.id, username: user.username, role: user.role};
					}),
					themes: doc.themes,
					visibility: doc.visibility
				});
			}
		}.toString()
	};

	ddoc.views.projects_public = {
		map: function(doc) {
			if (doc.type === 'project' && doc.visibility === 'public')
				emit();

		}.toString()
	};

	ddoc.views.projects_private = {
		map: function(doc) {
			if (doc.type === 'project' && doc.visibility === 'private')
				doc.users.forEach(function(user) {
					if (user.id)
						emit(user.id);
				});
		}.toString()
	};

	await database.insert(ddoc);
};

const updateProject = project => {
	project.visibility = 'public';

	project.logicalFrames.forEach(logframe => {
		logframe.start = logframe.end = null;
		logframe.purposes.forEach(purpose => {
			purpose.outputs.forEach(output => {
				output.activities = [];
			});
		});
	});

	project.forms.forEach(form => {
		form.elements.forEach(element => {
			element.partitions.forEach(partition => {
				if (partition.aggregation === 'none')
					partition.aggregation = 'sum';
			});
		});
	});

	project.users.forEach(function(user) {
		if (user.id)
			user.id = 'user:' + user.id.substring(4);

		if (user.role === 'input' && !user.dataSources)
			user.dataSources = project.forms.map(f => f.id);
	});

	project.themes = project.themes.map(id => 'theme:' + id);

	// indicators
	let newcc = {};
	for (let key in project.crossCutting)
		newcc['indicator:' + key] = project.crossCutting[key];
	project.crossCutting = newcc;
};

const migrateProjects = async () => {
	// Update projects, and create revisions.
	const dbResults = await database.callView('by_type', {key: 'project'});
	const documents = [];

	for (let i = 0; i < dbResults.rows.length; ++i) {
		console.log('project', i, '/', dbResults.rows.length);

		const projectId = dbResults.rows[i].id;
		const dbResult = await database.get(projectId, {revs_info: true, conflicts: true});

		if (dbResult._conflicts)
			dbResult._conflicts.forEach(rev => documents.push({_id: projectId, _rev: rev, _deleted: true}));

		// Get all old revision ids of the project
		const revisionIds = dbResult._revs_info
			.filter(revInfo => revInfo.status === 'available')
			.map(revInfo => revInfo.rev);

		// Delete the document.
		documents.push({_id: projectId, _rev: revisionIds[0], _deleted: true});

		// Fetch each couchdb revision, and create monitool revs.
		for (let j = 0; j < revisionIds.length; ++j) {
			const project = await database.get(projectId, {rev: revisionIds[j]});

			updateProject(project);

			// Create a project with the last version
			if (j === 0) {
				project._id = 'project:' + project._id;
				delete project._rev;
			}
			// Create revisions with all previous ones.
			else {
				const time = revisionIds[j].split('-')[0].padStart(16, '0')
				project._id = 'rev:project:' + project._id + ':' + time;
				delete project._rev;
				project.type = 'rev:project';
			}

			documents.push(project);
		}

	}

	// Insert 20 by 20 to avoid killing the database
	while (documents.length)
		await database.callBulk({docs: documents.splice(0, 20)});
};

const migrateInputs = async () => {
	// Load all projects (already updated).
	const dbResultProjects = await database.callView('by_type', {key: 'project', include_docs: true});
	const projectsById = {};
	dbResultProjects.rows.forEach(row => projectsById[row.id] = row.doc);

	// Update projects, and create revisions.
	const dbResults = await database.callView('by_type', {key: 'input'});
	const documents = [];

	for (let i = 0; i < dbResults.rows.length; ++i) {
		console.log('input', i, '/', dbResults.rows.length);

		const input = await database.get(dbResults.rows[i].id);
		const deleted = {_id: input._id, _rev: input._rev, _deleted: true};

		input._id = 'input:project:' + input._id;
		delete input._rev;
		input.project = 'project:' + input.project;
		input.structure = {};

		const dataSource = projectsById[input.project].forms.find(f => f.id === input.form);
		dataSource.elements.forEach(e => {
			input.structure[e.id] = e.partitions.map(partition => {
				return {
					id: partition.id,
					items: partition.elements.map(pe => pe.id),
					aggregation: partition.aggregation
				};
			});
		});

		documents.push(deleted, input)

		if (documents.length > 40) {
			await database.callBulk({docs: documents});
			documents.length = 0
		}
	}

	await database.callBulk({docs: documents});
};

const migrateIndicators = async () => {
	const dbResults = await database.callView('by_type', {key: 'indicator', include_docs: true});
	const documents = [];

	for (let i = 0; i < dbResults.rows.length; ++i) {
		const indicator = dbResults.rows[i].doc;

		documents.push({_id: indicator._id, _rev: indicator._rev, _deleted: true});

		indicator._id = 'indicator:' + indicator._id;
		delete indicator._rev;
		indicator.themes = indicator.themes.map(t => 'theme:' + t);
		documents.push(indicator);
	}

	await database.callBulk({docs: documents});
}

const migrateThemes = async () => {
	const dbResults = await database.callView('by_type', {key: 'theme', include_docs: true});
	const documents = [];

	for (let i = 0; i < dbResults.rows.length; ++i) {
		const theme = dbResults.rows[i].doc;

		documents.push({_id: theme._id, _rev: theme._rev, _deleted: true});

		theme._id = 'theme:' + theme._id;
		delete theme._rev;
		documents.push(theme);
	}

	await database.callBulk({docs: documents});
}

const migrateUsers = async () => {
	const dbResults = await database.callView('by_type', {key: 'user', include_docs: true});
	const documents = [];

	for (let i = 0; i < dbResults.rows.length; ++i) {
		const user = dbResults.rows[i].doc;

		documents.push({_id: user._id, _rev: user._rev, _deleted: true});

		user._id = 'user:' + user._id.substring(4);
		delete user._rev;
		documents.push(user);
	}

	await database.callBulk({docs: documents});
}


/**
 * Add activities to projects.
 */
export default async function() {
	await migrateDesignDoc();
	await migrateProjects();
	await migrateInputs();
	await migrateIndicators();
	await migrateThemes();
	await migrateUsers();

	// throw new Error();
};