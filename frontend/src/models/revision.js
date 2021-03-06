import axios from 'axios';
import jiff from 'jiff';

export default class Revision {
    static async fetch(projectId, offset, limit) {
        const response = await axios.get('/project/' + projectId + '/revisions', {
            params: { offset: offset, limit: limit },
        });

        return response.data.map(r => new Revision(r));
    }

    static enrich(project, revisions) {
        // Complete the information by computing afterState, beforeState, and forward patches.
        for (var i = 0; i < revisions.length; ++i) {
            if (revisions[i].before || revisions[i].after) continue;

            // Compute before and after state
            revisions[i].after = i === 0 ? project : revisions[i - 1].before;
            revisions[i].before = jiff.patch(revisions[i].backwards, revisions[i].after);
            revisions[i].forwards = jiff.diff(
                revisions[i].before,
                revisions[i].after,
                item => item.id || item.display
            );
            revisions[i].isEquivalent = angular.equals(project, revisions[i].before);
        }
    }

    constructor(data) {
        Object.assign(this, data);
    }
}
