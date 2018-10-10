

// Une organisation défini ses thematiques et ses indicateurs
{
	"id": "organisation:9931a9b1-87be-43e0-a35e-ac5bf15bdcc8",
	"name": "Médecins du Monde",
	"description": "This organisation contains all projects from MDM international missions",
	"thematics": [
		{
			"id": "e0f1bcb8-bc06-4743-845b-dfb325c4c9d5",
			"name": "SSR",
			"description": "Un projet rentre dans la thematique SSR quand il reunit au moins une des trois conditions suivantes: .....",

			"indicators": [
				{
					"id": "2111b9d6-419d-486d-86f3-5703b86f14c8",
					"name": "Taux de CPN1",
					"description": "Le taux de CPN1 doit etre calculé en prenant en compte que XYZ"
				}
			]
		}
	],

	"invitations": [
		{"role": "owner", "pattern": "eloims@gmail\\.com"},
		{"role": "owner", "pattern": "@gmail\\.com"}
	]
}



// Un lien organisation project definie le calcul des indicateurs.
{
	"_id": "link:9931a9b1-87be-43e0-a35e-ac5bf15bdcc8:0de8301a-d299-4d65-8ddc-48ab99c841a2",

	"thematics": [


	]{
		"e0f1bcb8-bc06-4743-845b-dfb325c4c9d5": {
			"2111b9d6-419d-486d-86f3-5703b86f14c8": {
				"formula": "copied_value",
				"filter": {
				},
				"parameters": {
					"copied_value": {
						"elementId": "9aaabb7b-f086-4f6c-a1a8-3a328a88269e",
						"filter": {}
					}
				}
			}
		},
		"9c15e1ba-8f84-473e-b1d9-3996a3c15083": {}
	}
}



// Utilisateur, contient un tableau avec les organisations dont il
// a accepté les invitations.
{
	"_id": "user:eloims@gmail.com",
	"email": "eloims@gmail.com",
	"passwordHash": "$2y$04$KE9PM3j4gXyGrm7OrqmEzuRFoFRW1KfczDacOIQcIJDRG0Bbs/I7e",
	"createdAt": "2018-10-03T09:26:08.434Z",

	"tokens": {
		"validateEmailTokenHash": null,
		"validateEmailSentAt": "2018-10-03T09:26:08.433Z",
		"resetPasswordTokenHash": null,
		"resetPasswordEmailSentAt": null
	},
	"organisations": {
		"accepted": [
			"organisation:1d695341-1f63-41b3-88b4-fc88161dce6e"
		],
		"discarded": [
		]
	}
}



// Les droits:
// ajouter / modifier la definition des indicateurs
// valider des comptes
//
// Ajouter des liens entre l'organisation et les projets.

// La liste des organisations et des indicateurs qu'elles collectent est disponibles à tous.
// Un utilisateur peut etre admin d'une organisation, ou membre.
// Pour qu'un projet rejoigne une organisation, il faut qu'il demande et que sa demande soit validée par un admin de la meme organisation.
// Où noter les utilisateurs d'une organisation?