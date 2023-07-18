const endpoint = 'https://raretoshi.com/api/v1/graphql';

document.addEventListener('DOMContentLoaded', () => {

  const query = `
    query {
      transactions(where: { 
        _or: [
          { type: { _eq: "purchase" } },
          { type: { _eq: "accept" } },
          { type: { _eq: "release" } }
        ]
      }) {
        amount
        type
        created_at
      }
    }
  `;

  let totalAmount = 0;
  let totalCount = 0;

  fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
      }),
    })
    .then((response) => response.json())
    .then((data) => {
      const transactions = data.data.transactions;

      transactions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      totalCount = transactions.length;

      transactions.forEach((transaction) => {
        const amount = Math.abs(transaction.amount);
        totalAmount += amount;
      });

      const totalAmountInBTC = totalAmount / 100000000;

      const resultContainer2 = document.getElementById('resultContainer2');
      resultContainer2.textContent = `Total sales count: ${totalCount}\nTotal sales (L-BTC): ${totalAmountInBTC}`;

      const ctx = document.getElementById('myChart').getContext('2d');

      // Function to group transactions by day
      function groupTransactionsByDay(transactions) {
        const groupedData = {};

        transactions.forEach((transaction) => {
          const date = new Date(transaction.created_at).toLocaleDateString();

          if (groupedData[date]) {
            groupedData[date] += Math.abs(transaction.amount);
          } else {
            groupedData[date] = Math.abs(transaction.amount);
          }
        });

        return groupedData;
      }

      // Function to update the chart with filtered data
      function updateChart(startDate, endDate) {
        const filteredTransactions = transactions.filter((transaction) => {
          const date = new Date(transaction.created_at);
          return date >= startDate && date <= endDate;
        });

        const groupedData = groupTransactionsByDay(filteredTransactions);

        // Update chart data
        myChart.data.labels = Object.keys(groupedData);
        myChart.data.datasets[0].data = Object.values(groupedData);

        // Redraw the chart
        myChart.update();

        // Show "No matching volume found!" message if no transactions
        const noDataMessage = document.getElementById('noDataMessage');
        if (filteredTransactions.length === 0) {
          noDataMessage.style.display = 'block';
        } else {
          noDataMessage.style.display = 'none';
        }
      }

      // Convert transaction data to chart dataset format, grouped by day
      const groupedData = groupTransactionsByDay(transactions);
      const chartData = {
        labels: Object.keys(groupedData),
        datasets: [{
          label: 'Sales',
          data: Object.values(groupedData),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      };

      const config = {
        type: 'bar',
        data: chartData,
        options: {
          plugins: {
            title: {
              text: 'Sales Volume (in Sats)',
              display: true
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Sats'
              },
              ticks: {
                beginAtZero: true
              }
            }
          }
        }
      };

        let chartType = 'bar'; // Start mit Balkenansicht

      let myChart = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: config.options
      });

      // Toggle Chart Type Button
      const toggleChartTypeButton = document.getElementById('toggleChartTypeButton');
      toggleChartTypeButton.addEventListener('click', () => {
        chartType = chartType === 'bar' ? 'line' : 'bar'; // Umschalten des Chart-Typs

        myChart.destroy(); // Zerstöre den alten Chart
        myChart = new Chart(ctx, {
          type: chartType,
          data: chartData,
          options: config.options
        }); // Erstelle den Chart mit dem aktualisierten Chart-Typ
      });

      // Update chart based on filter options
      function applyFilter() {
        const startDateInput = document.getElementById('startDateInput');
        const endDateInput = document.getElementById('endDateInput');

        const startDate = startDateInput.value !== '' ? new Date(startDateInput.value) : new Date(0);
        const endDate = endDateInput.value !== '' ? new Date(endDateInput.value) : new Date();


        updateChart(startDate, endDate);
      }

      // Apply filter button event listener
      const applyFilterButton = document.getElementById('applyFilterButton');
      applyFilterButton.addEventListener('click', applyFilter);

      // Reset chart to initial view
      const resetChartButton = document.getElementById('resetChartButton');
      resetChartButton.addEventListener('click', () => {
        const startDateInput = document.getElementById('startDateInput');
        const endDateInput = document.getElementById('endDateInput');

        startDateInput.value = ''; // Setze Startdatum auf leer
        endDateInput.value = ''; // Setze Enddatum auf leer

        applyFilter(); // Führe die Filterfunktion erneut aus, um den Chart zurückzusetzen
      });
    })
    .catch((error) => {
      console.error('An error occurred:', error);
    });
});







  document.getElementById('userButton').addEventListener('click', async () => {
    const userTypeInput = document.getElementById('userType');
    const userQueryInput = document.getElementById('userQuery');
  
    const userType = userTypeInput.value;
    const userQuery = userQueryInput.value;
  
    let userFilter = {};
    if (userType) {
      userFilter.is_artist = { _eq: userType === 'true' };
    }
  
    if (userQuery) {
      userFilter._or = [
        { username: { _like: `%${userQuery}%` } },
        { address: { _eq: userQuery } },
      ];
    }
  
    const query = `query($userFilter: users_bool_exp!, $orderBy: [users_order_by!]) {
      users(where: $userFilter, order_by: $orderBy) {
        username
        address
        is_artist
      }
    }`;
  
    const variables = {
      userFilter: userFilter,
      orderBy: [{ username: 'asc' }]
    };
  
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
    });
  
    const result = await response.json();
    const userResult = document.getElementById('userResult');
  
    if (result.data && result.data.users && result.data.users.length > 0) {
      const users = result.data.users;
  
      const createTableHeader = () => {
        const tableHeader = document.createElement('tr');
        tableHeader.innerHTML = `
          <th data-sort="username">User name</th>
          <th data-sort="address">Address</th>
          <th data-sort="is_artist">User type</th>
        `;
        tableHeader.addEventListener('click', handleSort);
        return tableHeader;
      };
  
      const handleSort = (event) => {
        const attribute = event.target.getAttribute('data-sort');
        if (attribute) {
          let order = 'asc';
          if (variables.orderBy && variables.orderBy[0] && variables.orderBy[0][attribute] === 'asc') {
            order = 'desc';
          }
          variables.orderBy = [{ [attribute]: order }];
          fetchUsers();
        }
      };
  
      const createUserRow = (user) => {
        const userRow = document.createElement('tr');
        userRow.innerHTML = `
          <td>${user.username}</td>
          <td>${user.address}</td>
          <td>${user.is_artist ? 'Artist' : 'Other'}</td>
        `;
        return userRow;
      };
  
      const fetchUsers = async () => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            variables: variables,
          }),
        });
  
        const result = await response.json();
        if (result.data && result.data.users && result.data.users.length > 0) {
          const users = result.data.users;
          const userList = document.createElement('table');
          userList.appendChild(createTableHeader());
  
          users.forEach(user => {
            const userRow = createUserRow(user);
            userList.appendChild(userRow);
          });
  
          userResult.innerHTML = '';
          userResult.appendChild(userList);
          const resultCountContainer = document.createElement('div');
          const resultCount = users.length;
          resultCountContainer.textContent = `${resultCount} user(s) found.`;
          userResult.insertBefore(resultCountContainer, userList);
        } else {
          userResult.textContent = 'No user(s) found.';
        }
      };
  
      fetchUsers();
    } else {
      userResult.textContent = 'No user(s) found.';
    }
  });
  


  document.getElementById('transactionsButton').addEventListener('click', async () => {
    const transactionTypeInput = document.getElementById('transactionType');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
  
    const transactionType = transactionTypeInput.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
  
    let transactionFilter = {};
    if (transactionType) {
      transactionFilter.type = { _eq: transactionType };
    }
  
    if (startDate && endDate) {
      transactionFilter.created_at = { _gte: startDate, _lte: endDate };
    }
  
    const query = `query($transactionFilter: transactions_bool_exp!) {
      transactions(where: $transactionFilter) {
        id
        hash
        asset
        type
        amount
        artwork {
          asset
          asking_asset
          held
          title
          filename
          filetype
          last_active
          transferred_at
          bid_increment
          created_at
        }
        bid {
          id
        }
        created_at
      }
    }`;
  
    const variables = {
      transactionFilter: transactionFilter,
    };
  
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
    });
  
    const result = await response.json();
    const transactionsResult = document.getElementById('transactionsResult');
  
    if (result.data && result.data.transactions && result.data.transactions.length > 0) {
      const transactions = result.data.transactions;
      const transactionList = document.createElement('table');
      transactionList.innerHTML = `
        <tr>
          <th data-sort="hash">TX Hash</th>
          <th data-sort="type">Type</th>
          <th data-sort="created_at">Active At</th>
          <th data-sort="asset">Asset</th>
          <th data-sort="amount">Paying Amount</th>
          <th data-sort="asking_asset">Asking Asset</th>
          <th data-sort="title">Artwork Title</th>
          <th data-sort="artwork_asset">Artwork Asset</th>
          <th data-sort="bid">Bid</th>
          <th data-sort="artwork_created_at">Artwork Created At</th>
          <th data-sort="artwork_asset">Artwork Liquid Asset ID</th>
          <th data-sort="filename">Artwork Filename</th>
          <th data-sort="filetype">Artwork Filetype</th>
          <th data-sort="transferred_at">Artwork Transferred At</th>
          <th data-sort="held">Artwork Held</th>
          <th data-sort="bid_increment">Artwork Bid Increment</th>
          <th>RT Internal ID</th>
        </tr>
      `;
  
      let sortDirectionMap = {};
  
      const sortTransactions = (attribute) => {
        if (attribute in sortDirectionMap) {
          sortDirectionMap[attribute] = sortDirectionMap[attribute] === 'asc' ? 'desc' : 'asc';
        } else {
          sortDirectionMap[attribute] = 'asc';
        }
  
        const sortDirection = sortDirectionMap[attribute];
  
        transactions.sort((a, b) => {
          const valueA = a[attribute];
          const valueB = b[attribute];
  
          if (['created_at', 'artwork_created_at', 'transferred_at'].includes(attribute)) {
            // Spezielle Sortierung für Datums- und Uhrzeitattribute
            const dateA = new Date(valueA);
            const dateB = new Date(valueB);
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
          } else if (attribute === 'asset') {
            // Sortierung für das Asset
            const displayedAssetA = a.asset === '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d' ? 'L-BTC' : a.asset;
            const displayedAssetB = b.asset === '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d' ? 'L-BTC' : b.asset;
            return sortDirection === 'asc' ? displayedAssetA.localeCompare(displayedAssetB) : displayedAssetB.localeCompare(displayedAssetA);
          } else {
            // Standard-Sortierung für andere Attribute
            if (typeof valueA === 'undefined' || valueA === null) return -1;
            if (typeof valueB === 'undefined' || valueB === null) return 1;
  
            if (typeof valueA === 'string' && typeof valueB === 'string') {
              // Alphanumerische Sortierung
              return sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
            } else {
              // Numerische Sortierung
              return sortDirection === 'asc' ? parseFloat(valueA) - parseFloat(valueB) : parseFloat(valueB) - parseFloat(valueA);
            }
          }
        });
  
        renderTransactions(transactions);
      };
  
      const renderTransactions = (transactions) => {
        const transactionCount = transactions.length;
  
        const resultCountContainer = document.getElementById('resultCountContainer');
        resultCountContainer.innerHTML = `<p>${transactionCount} transaction(s) found.</p>`;
        transactionList.innerHTML = `
          <tr>
            <th data-sort="hash">TX Hash</th>
            <th data-sort="type">Type</th>
            <th data-sort="created_at">Active At</th>
            <th data-sort="asset">Asset</th>
            <th data-sort="amount">Paying Amount</th>
            <th data-sort="asking_asset">Asking Asset</th>
            <th data-sort="title">Artwork Title</th>
            <th data-sort="artwork_asset">Artwork Asset</th>
            <th data-sort="bid">Bid</th>
            <th data-sort="artwork_created_at">Artwork Created At</th>
            <th data-sort="artwork_asset">Artwork Liquid Asset ID</th>
            <th data-sort="filename">Artwork Filename</th>
            <th data-sort="filetype">Artwork Filetype</th>
            <th data-sort="transferred_at">Artwork Transferred At</th>
            <th data-sort="held">Artwork Held</th>
            <th data-sort="bid_increment">Artwork Bid Increment</th>
            <th>RT Internal ID</th>
          </tr>
        `;
  
        transactions.forEach((transaction) => {
          const transactionRow = document.createElement('tr');
          const asset = transaction.asset;
          const askingAsset = transaction.artwork ? transaction.artwork.asking_asset : '';
  
          const displayedAsset = asset === '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d' ? 'L-BTC' : asset;
          const displayedAskingAsset = askingAsset === '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d' ? 'L-BTC' : askingAsset;
  
          transactionRow.innerHTML = `
            <td>${transaction.hash}</td>
            <td>${transaction.type}</td>
            <td>${formatDateTime(transaction.created_at)}</td>
            <td>${displayedAsset}</td>
            <td>${transaction.amount}</td>
            <td>${displayedAskingAsset}</td>
            <td>${transaction.artwork ? transaction.artwork.title : ''}</td>
            <td>${transaction.artwork ? transaction.artwork.asset : ''}</td>
            <td>${transaction.bid ? transaction.bid.id : ''}</td>
            <td>${formatDateTime(transaction.artwork ? transaction.artwork.created_at : '')}</td>
            <td>${transaction.artwork ? transaction.artwork.asset : ''}</td>
            <td>${transaction.artwork ? transaction.artwork.filename : ''}</td>
            <td>${transaction.artwork ? transaction.artwork.filetype : ''}</td>
            <td>${formatDateTime(transaction.artwork ? transaction.artwork.transferred_at : '')}</td>
            <td>${transaction.artwork ? transaction.artwork.held : ''}</td>
            <td>${transaction.artwork ? transaction.artwork.bid_increment : ''}</td>
            <td>${transaction.id}</td>
          `;
  
          transactionList.appendChild(transactionRow);
        });
  
        transactionsResult.innerHTML = '';
        transactionsResult.appendChild(transactionList);
  
        const sortableHeaders = transactionList.querySelectorAll('[data-sort]');
        sortableHeaders.forEach((header) => {
          header.addEventListener('click', () => {
            const attribute = header.getAttribute('data-sort');
            sortTransactions(attribute);
          });
        });
      };
  
      renderTransactions(transactions);
    } else {
      transactionsResult.innerHTML = '<p>No transaction(s) found.</p>';
    }
  }); 
  


        const formatDateTime = (dateTime) => {
  if (dateTime) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const date = new Date(dateTime);
    return date.toLocaleDateString(undefined, options);
  } else {
    return '';
  }
};


document.getElementById('artworkButton').addEventListener('click', async () => {
  const artworkQuery = document.getElementById('artworkQuery').value;
  const ownerQuery = document.getElementById('ownerQuery').value;
  const artistQuery = document.getElementById('artistQuery').value;
  const bidFilter = document.getElementById('bidFilter').checked;

  let artworkFilter = {};

  if (artworkQuery || ownerQuery || artistQuery || bidFilter) {
    if (artworkQuery) {
      artworkFilter._or = [
        { asset: { _ilike: `%${artworkQuery}%` } },
        { title: { _ilike: `%${artworkQuery}%` } },
        { ticker: { _ilike: `%${artworkQuery}%` } },
      ];
    }
    if (bidFilter) {
      artworkFilter.bid = { amount: { _gt: 0 } };
    }
    if (ownerQuery) {
      artworkFilter.owner = { username: { _ilike: `%${ownerQuery}%` } };
    }
    if (artistQuery) {
      artworkFilter.artist = { username: { _ilike: `%${artistQuery}%` } };
    }
  }

  const query = `query($artworkFilter: artworks_bool_exp!) {
    artworks(where: $artworkFilter) {
      id
      asset
      edition
      editions
      views
      has_royalty
      is_physical
      ticker
      reserve_price
      royalty_recipients {
        amount
        address
        name
      }
      list_price
      artist {
        username
        address
        multisig
        avatar_url
      }
      owner {
        id
        username
        address
        multisig
        avatar_url
      }
      title
      bid {
        amount
      }
      description
      tags { tag }
      created_at
      transferred_at
    }
  }`;

  const variables = {
    artworkFilter: artworkFilter,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  });

  const result = await response.json();
  const artworkResult = document.getElementById('artworkResult');

  if (result.data && result.data.artworks && result.data.artworks.length > 0) {
    const artworks = result.data.artworks;
    const artworkList = document.createElement('table');
    const tableHead = document.createElement('thead');
    const tableBody = document.createElement('tbody');

    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
      <th onclick="sortTable(0)">ID</th>
      <th onclick="sortTable(1)">Title</th>
      <th onclick="sortTable(2)">Asset</th>
      <th onclick="sortTable(3)">Edition</th>
      <th onclick="sortTable(4)">Total Editions</th>
      <th onclick="sortTable(5)">Views</th>
      <th onclick="sortTable(6)">Artist Username</th>
      <th onclick="sortTable(7)">Artist Address</th>
      <th onclick="sortTable(8)">Artist Multisig</th>
      <th onclick="sortTable(9)">Artist Avatar</th>
      <th onclick="sortTable(10)">List Price</th>
      <th onclick="sortTable(11)">Reserve Price</th>
      <th onclick="sortTable(12)">Owner ID</th>
      <th onclick="sortTable(13)">Owner Username</th>
      <th onclick="sortTable(14)">Owner Address</th>
      <th onclick="sortTable(15)">Owner Multisig</th>
      <th onclick="sortTable(16)">Owner Avatar</th>
      <th onclick="sortTable(17)">Bid</th>
      <th onclick="sortTable(18)">Ticker</th>
      <th onclick="sortTable(19)">Description</th>
      <th onclick="sortTable(20)">Has Royalty</th>
      <th onclick="sortTable(21)">Royalty Recipients</th>
      <th onclick="sortTable(22)">Tags</th>
      <th onclick="sortTable(23)">Created At</th>
      <th onclick="sortTable(24)">Transferred At</th>
    `;

    tableHead.appendChild(headerRow);
    artworkList.appendChild(tableHead);
    artworkList.appendChild(tableBody);

    artworks.forEach(artwork => {
      const artworkRow = document.createElement('tr');
      artworkRow.innerHTML = `
        <td>${artwork.id}</td>
        <td>${artwork.title}</td>
        <td>${artwork.asset}</td>
        <td>${artwork.edition}</td>
        <td>${artwork.editions}</td>
        <td>${artwork.views}</td>
        <td>${artwork.artist ? artwork.artist.username : ''}</td>
        <td>${artwork.artist ? artwork.artist.address : ''}</td>
        <td>${artwork.artist ? artwork.artist.multisig : ''}</td>
        <td>${artwork.artist ? artwork.artist.avatar_url : ''}</td>
        <td>${artwork.list_price}</td>
        <td>${artwork.reserve_price}</td>
        <td>${artwork.owner ? artwork.owner.id : ''}</td>
        <td>${artwork.owner ? artwork.owner.username : ''}</td>
        <td>${artwork.owner ? artwork.owner.address : ''}</td>
        <td>${artwork.owner ? artwork.owner.multisig : ''}</td>
        <td>${artwork.owner ? artwork.owner.avatar_url : ''}</td>
        <td>${artwork.bid ? artwork.bid.amount : ''}</td>
        <td>${artwork.ticker}</td>
        <td class="description-cell" title="${artwork.description}">${artwork.description}</td>
        <td>${artwork.has_royalty ? 'Yes' : 'No'}</td>
      `;

      const royaltyRecipients = artwork.royalty_recipients;
      let royaltyHTML = '';
      if (royaltyRecipients && royaltyRecipients.length > 0) {
        royaltyRecipients.forEach(recipient => {
          royaltyHTML += `<div>${recipient.name} (${recipient.address}) - ${recipient.amount}</div>`;
        });
      }
      artworkRow.innerHTML += `<td>${royaltyHTML}</td>`;

      const tags = artwork.tags;
      let tagsHTML = '';
      if (tags && tags.length > 0) {
        tags.forEach(tag => {
          tagsHTML += `<div>${tag.tag}</div>`;
        });
      }
      artworkRow.innerHTML += `<td>${tagsHTML}</td>`;

      artworkRow.innerHTML += `<td>${formatDateTime(artwork.created_at)}</td>`;
      artworkRow.innerHTML += `<td>${formatDateTime(artwork.transferred_at)}</td>`;

      tableBody.appendChild(artworkRow);
    });

    artworkResult.innerHTML = '';
    artworkResult.appendChild(artworkList);

    const resultCountContainer1 = document.getElementById('resultCountContainer1');
    const resultCount = artworks.length;
    resultCountContainer1.textContent = `${resultCount} matching artwork(s) found.`;
  } else {
    artworkResult.textContent = 'No artwork(s) found.';
  }

  const descriptionCells = document.getElementsByClassName('description-cell');
  Array.from(descriptionCells).forEach(cell => {
    cell.addEventListener('click', toggleDescription);
  });

  function toggleDescription(event) {
    const cell = event.target;

    if (cell.classList.contains('expanded')) {
      cell.classList.remove('expanded');
    } else {
      Array.from(descriptionCells).forEach(otherCell => {
        if (otherCell !== cell && otherCell.classList.contains('expanded')) {
          otherCell.classList.remove('expanded');
        }
      });

      cell.classList.add('expanded');
    }
  }

  function formatDateTime(dateTime) {
    const date = new Date(dateTime);
    const formattedDate = date.toLocaleDateString('en-US');
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${formattedDate} ${formattedTime}`;
  }

  const tableHeaders = document.querySelectorAll('th');
  tableHeaders.forEach((header, index) => {
    header.addEventListener('click', () => {
      sortTable(index);
    });
  });

  function sortTable(n) {
    const table = document.querySelector('table');
    const tableBody = table.querySelector('tbody');
    const rows = Array.from(tableBody.rows);
    const headerRow = table.querySelector('thead tr');
    const isAscending = !headerRow.cells[n].classList.contains('asc');

    rows.forEach(row => {
      row.classList.remove('asc', 'desc');
    });

    if (isAscending) {
      headerRow.cells[n].classList.add('asc');
      rows.sort((a, b) => compareCells(a.cells[n], b.cells[n]));
    } else {
      headerRow.cells[n].classList.add('desc');
      rows.sort((a, b) => compareCells(b.cells[n], a.cells[n]));
    }

    rows.forEach(row => {
      tableBody.appendChild(row);
    });
  }

  function compareCells(cellA, cellB) {
    const valueA = cellA.textContent.trim();
    const valueB = cellB.textContent.trim();

    if (!isNaN(valueA) && !isNaN(valueB)) {
      return parseFloat(valueA) - parseFloat(valueB);
    } else {
      return valueA.localeCompare(valueB);
    }
  }
});




      document.getElementById('collectorButton').addEventListener('click', async () => {
  const collectorQueryInput = document.getElementById('collectorQuery');
  const collectorQuery = collectorQueryInput.value.toLowerCase();

  const query = `
    query GetCollectors($collectorQuery: String!) {
      collectors(where: { _or: [{ username: { _ilike: $collectorQuery } }, { address: { _ilike: $collectorQuery } }] }) {
        username
        address
        owned
        collected
        resold
        avg_price
        total_price
      }
    }
  `;

  const variables = {
    collectorQuery: `%${collectorQuery}%`,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  });

  const result = await response.json();

  if (result.data && result.data.collectors && result.data.collectors.length > 0) {
    const collectors = result.data.collectors;
    const collectorList = createCollectorList(collectors);

    const collectorQueryPromises = collectors.map(async (collector, index) => {
      const transactionData = await fetchTransactionData(collector.username);

      return { index, data: transactionData };
    });

    Promise.all(collectorQueryPromises)
      .then(results => {
        results.forEach(({ index, data }) => {
          collectors[index].purchase_count = data.purchase_count;
          collectors[index].total_spent = data.total_spent;
          collectors[index].avg_spent = (data.total_spent / data.purchase_count / 100000000).toFixed(8) + ' L-BTC';
        });

        const collectorResult = document.getElementById('collectorResult');
        collectorResult.innerHTML = '';
        collectorResult.appendChild(collectorList);

        const tbody = collectorList.querySelector('tbody');
        tbody.innerHTML = '';

        collectors.forEach(collector => {
          const collectorRow = document.createElement('tr');
          collectorRow.innerHTML = `
            <td>${collector.username}</td>
            <td>${collector.address}</td>
            <td>${collector.owned}</td>
            <td>${collector.purchase_count !== undefined ? collector.purchase_count : '-'}</td>
            <td>${collector.resold}</td>
            <td>${collector.avg_spent !== undefined ? collector.avg_spent : '-'}</td>
            <td>${collector.total_spent !== undefined ? (collector.total_spent / 100000000).toFixed(8) + ' L-BTC' : '-'}</td>
          `;
          tbody.appendChild(collectorRow);
        });

        const resultCountContainer = document.createElement('div');
        const resultCount = collectors.length;
        resultCountContainer.textContent = `${resultCount} collector(s) found.`;
        collectorResult.insertBefore(resultCountContainer, collectorList);
      })
      .catch(error => console.error('Fehler:', error));
  } else {
    const collectorResult = document.getElementById('collectorResult');
    collectorResult.textContent = 'No collectors found.';
  }
});

        function createCollectorList(collectors) {
  const collectorList = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  thead.innerHTML = `
    <tr>
      <th onclick="sortTableByColumn(0)">Collector Name</th>
      <th onclick="sortTableByColumn(1)">Address</th>
      <th onclick="sortTableByColumn(2)">Held NFT Count</th>
      <th onclick="sortTableByColumn(3)">Purchases</th>
      <th onclick="sortTableByColumn(4)">Resell Count</th>
      <th onclick="sortTableByColumn(5)">Avg Spent</th>
      <th onclick="sortTableByColumn(6)">Spent Total</th>
    </tr>
  `;

  collectors.forEach(collector => {
    const collectorRow = document.createElement('tr');
    collectorRow.innerHTML = `
      <td>${collector.username}</td>
      <td>${collector.address}</td>
      <td>${collector.owned}</td>
      <td>${collector.purchase_count !== undefined ? collector.purchase_count : '-'}</td>
      <td>${collector.resold}</td>
      <td>${collector.avg_spent !== undefined ? collector.avg_spent : '-'}</td>
      <td>${collector.total_spent !== undefined ? (collector.total_spent / 100000000).toFixed(8) + ' L-BTC' : '-'}</td>
    `;

    tbody.appendChild(collectorRow);
  });

  collectorList.appendChild(thead);
  collectorList.appendChild(tbody);

  return collectorList;
}

        async function fetchTransactionData(bidUsername) {
  const query = `
    query GetTransactions($bidUsername: String!) {
      transactions(where: {
        _or: [
          { 
            type: { _eq: "accept" },
            bid: { user: { username: { _eq: $bidUsername }}}
          },
          {
            type: { _eq: "purchase" },
            user: { username: { _eq: $bidUsername }}
          },
          {
            type: { _eq: "release" },
            user: { username: { _eq: $bidUsername }}
          }
        ]
      }) {
        amount
      }
    }
  `;

  const variables = {
    bidUsername: bidUsername,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  });

  const result = await response.json();

  if (result.data && result.data.transactions) {
    const transactions = result.data.transactions;
    const totalAmount = transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const totalCount = transactions.length;

    return { purchase_count: totalCount, total_spent: totalAmount };
  } else {
    return { purchase_count: 0, total_spent: 0 };
  }
}
        let sortAscending = true;

        function sortTableByColumn(columnIndex) {
  const table = document.querySelector('table');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const isNumeric = columnIndex === 2 || columnIndex === 3 || columnIndex === 4 || columnIndex === 5 || columnIndex === 6;

  // Umschalten zwischen aufsteigendem und absteigendem Sortieren
  sortAscending = !sortAscending;

  rows.sort((rowA, rowB) => {
    const cellA = rowA.querySelectorAll('td')[columnIndex].textContent;
    const cellB = rowB.querySelectorAll('td')[columnIndex].textContent;

    if (isNumeric) {
      const valueA = parseFloat(cellA);
      const valueB = parseFloat(cellB);

      if (sortAscending) {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    } else {
      if (sortAscending) {
        return cellA.localeCompare(cellB);
      } else {
        return cellB.localeCompare(cellA);
      }
    }
  });
  tbody.innerHTML = '';

  rows.forEach(row => {
    tbody.appendChild(row);
  });
}


      document.addEventListener('DOMContentLoaded', async () => {
  const endpoint = 'https://raretoshi.com/api/v1/graphql';
  const queryArtists = `query($username: String!) {
    artists(where: { username: { _ilike: $username } }) {
      username
      creations
      highest_sale
      avg_sale
      sold
    }
  }`;

  const artistSearchInput = document.getElementById('artistQuery');
  const artistSearchButton = document.getElementById('artistButton');
  const artistStatsResult = document.getElementById('artistResult');
  const searchCount = document.getElementById('searchCount');

  artistSearchButton.addEventListener('click', async () => {
    const artistQuery = artistSearchInput.value.toLowerCase();

    const responseArtists = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: queryArtists,
        variables: {
          username: `%${artistQuery}%`,
        },
      }),
    });

    const resultArtists = await responseArtists.json();

    if (resultArtists.data && resultArtists.data.artists && resultArtists.data.artists.length > 0) {
      const artists = resultArtists.data.artists;
      const artistStatsTable = document.createElement('table');
      artistStatsTable.innerHTML = `
        <thead>
          <tr>
            <th onclick="sortTable(0)">Username</th>
            <th onclick="sortTable(1)">Creations</th>
            <th onclick="sortTable(2)">Total Amounts</th>
            <th onclick="sortTable(3)">Highest Sale</th>
            <th onclick="sortTable(4)">Average Sale</th>
            <th onclick="sortTable(5)">Sold</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const totalAmountPromises = artists.map(async artist => {
        const transactionsQuery = `query {
          transactions(where: {
            artwork: { artist: { username: { _eq: "${artist.username}" } } },
            _or: [
              { type: { _eq: "purchase" } },
              { type: { _eq: "accept" } },
              { type: { _eq: "release" } }
            ]
          }) {
            amount
            type
            artwork { 
              title
              artist { username }
            } 
          }
        }`;

        const responseTransactions = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: transactionsQuery,
          }),
        });

        const resultTransactions = await responseTransactions.json();

        if (resultTransactions.data && resultTransactions.data.transactions && resultTransactions.data.transactions.length > 0) {
          const transactions = resultTransactions.data.transactions;
          let totalAmount = 0;
          let highestSale = 0;
          let highestSaleTitle = '';

          transactions.forEach(transaction => {
            const amount = Math.abs(transaction.amount);
            totalAmount += amount;
            if (amount > highestSale) {
              highestSale = amount;
              highestSaleTitle = transaction.artwork.title;
            }
          });

          const averageSale = artist.sold !== 0 ? totalAmount / artist.sold : 0;

          return { totalAmount, highestSale, highestSaleTitle, averageSale };
        } else {
          return { totalAmount: 0, highestSale: 0, highestSaleTitle: '', averageSale: 0 };
        }
      });

      const totalAmounts = await Promise.all(totalAmountPromises);

      artists.forEach((artist, index) => {
        const artistRow = document.createElement('tr');
        artistRow.innerHTML = `
          <td>${artist.username}</td>
          <td>${artist.creations}</td>
          <td>${(totalAmounts[index].totalAmount / 100000000).toFixed(8)} L-BTC</td>
          <td>
            <span>${(totalAmounts[index].highestSale / 100000000).toFixed(8)}</span>
            <span>L-BTC</span>
            <span>${totalAmounts[index].highestSaleTitle}</span>
          </td>
          <td>${(totalAmounts[index].averageSale / 100000000).toFixed(8)} L-BTC</td>
          <td>${artist.sold}</td>
        `;

        artistStatsTable.querySelector('tbody').appendChild(artistRow);
      });

      artistStatsResult.innerHTML = '';
      artistStatsResult.appendChild(artistStatsTable);

      searchCount.textContent = `${artists.length} artist(s) found.`;
    } else {
      artistStatsResult.textContent = 'No artists found.';
      searchCount.textContent = '0 artist(s) found.';
    }

    const tableHeaders = document.querySelectorAll('th');
    tableHeaders.forEach((header, index) => {
      header.addEventListener('click', () => {
        sortTable(index);
      });
    });

    function sortTable(n) {
      const table = document.querySelector('table');
      const rows = Array.from(table.rows);
      const headerRow = rows[0];
      const isAscending = !headerRow.cells[n].classList.contains('asc');

      rows.forEach(row => {
        row.classList.remove('asc', 'desc');
      });

      if (isAscending) {
        headerRow.cells[n].classList.add('asc');
        rows.sort((a, b) => {
          if (n === 3) {
            return compareNumericCells(a.cells[n], b.cells[n]);
          } else {
            return compareCells(a.cells[n], b.cells[n]);
          }
        });
      } else {
        headerRow.cells[n].classList.add('desc');
        rows.sort((a, b) => {
          if (n === 3) {
            return compareNumericCells(b.cells[n], a.cells[n]);
          } else {
            return compareCells(b.cells[n], a.cells[n]);
          }
        });
      }

      rows.forEach(row => {
        table.appendChild(row);
      });
    }

    function compareCells(cellA, cellB) {
      const valueA = cellA.textContent.trim();
      const valueB = cellB.textContent.trim();

      if (!isNaN(valueA) && !isNaN(valueB)) {
        return parseFloat(valueA) - parseFloat(valueB);
      } else {
        return valueA.localeCompare(valueB);
      }
    }

    function compareNumericCells(cellA, cellB) {
      const valueA = parseFloat(cellA.textContent.trim());
      const valueB = parseFloat(cellB.textContent.trim());

      return valueA - valueB;
    }
  });
});
